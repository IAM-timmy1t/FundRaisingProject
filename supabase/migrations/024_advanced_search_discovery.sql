-- Migration: Advanced Search & Discovery
-- Task #23: Enable users to easily find campaigns through powerful search

-- Enable full-text search extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For fuzzy search and typo tolerance
CREATE EXTENSION IF NOT EXISTS unaccent; -- For accent-insensitive search

-- Create search configuration for multi-language support
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS campaign_search (COPY = english);

-- Add search vector column to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS search_vector tsvector,
ADD COLUMN IF NOT EXISTS search_rank DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trending_score DECIMAL DEFAULT 0;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_campaign_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('campaign_search', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('campaign_search', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('campaign_search', COALESCE(NEW.category, '')), 'C') ||
        setweight(to_tsvector('campaign_search', COALESCE(NEW.location, '')), 'C') ||
        setweight(to_tsvector('campaign_search', COALESCE(NEW.tags::text, '')), 'D');
    
    -- Update search rank based on various factors
    NEW.search_rank := 
        COALESCE(NEW.current_amount / NULLIF(NEW.goal_amount, 0), 0) * 0.3 + -- Funding progress
        COALESCE(NEW.donation_count, 0) * 0.2 + -- Popularity
        CASE WHEN NEW.is_featured THEN 1 ELSE 0 END * 0.2 + -- Featured status
        COALESCE(NEW.trust_score, 0) / 100 * 0.3; -- Trust score
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for search vector
CREATE TRIGGER update_campaign_search_vector_trigger
BEFORE INSERT OR UPDATE ON campaigns
FOR EACH ROW
EXECUTE FUNCTION update_campaign_search_vector();

-- Create saved searches table
CREATE TABLE IF NOT EXISTS saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    search_query TEXT,
    filters JSONB,
    sort_by VARCHAR(50),
    alert_enabled BOOLEAN DEFAULT FALSE,
    alert_frequency VARCHAR(20) DEFAULT 'daily',
    last_alert_sent TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT saved_searches_frequency_check CHECK (
        alert_frequency IN ('immediate', 'daily', 'weekly', 'monthly')
    )
);

-- Create search history table
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    search_query TEXT NOT NULL,
    filters JSONB,
    result_count INTEGER,
    clicked_results JSONB,
    session_id VARCHAR(255),
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create search suggestions table
CREATE TABLE IF NOT EXISTS search_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term VARCHAR(255) NOT NULL UNIQUE,
    popularity INTEGER DEFAULT 0,
    category VARCHAR(100),
    related_terms TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create related campaigns view
CREATE OR REPLACE VIEW related_campaigns AS
WITH campaign_similarities AS (
    SELECT 
        c1.id as campaign_id,
        c2.id as related_id,
        c2.title as related_title,
        c2.image_url as related_image,
        c2.current_amount,
        c2.goal_amount,
        -- Calculate similarity score
        (
            CASE WHEN c1.category = c2.category THEN 0.4 ELSE 0 END +
            CASE WHEN c1.creator_id = c2.creator_id THEN 0.2 ELSE 0 END +
            CASE 
                WHEN c1.location = c2.location THEN 0.2 
                WHEN c1.location ILIKE '%' || c2.location || '%' THEN 0.1
                ELSE 0 
            END +
            similarity(c1.title, c2.title) * 0.2
        ) as similarity_score
    FROM campaigns c1
    CROSS JOIN campaigns c2
    WHERE c1.id != c2.id
    AND c2.status = 'active'
)
SELECT 
    campaign_id,
    array_agg(
        jsonb_build_object(
            'id', related_id,
            'title', related_title,
            'image_url', related_image,
            'current_amount', current_amount,
            'goal_amount', goal_amount,
            'similarity_score', similarity_score
        ) ORDER BY similarity_score DESC
    ) FILTER (WHERE similarity_score > 0.3) as related
FROM campaign_similarities
GROUP BY campaign_id;

-- Create function for full-text search with typo tolerance
CREATE OR REPLACE FUNCTION search_campaigns(
    search_term TEXT,
    category_filter VARCHAR(100) DEFAULT NULL,
    location_filter VARCHAR(255) DEFAULT NULL,
    min_progress DECIMAL DEFAULT NULL,
    max_progress DECIMAL DEFAULT NULL,
    min_amount DECIMAL DEFAULT NULL,
    max_amount DECIMAL DEFAULT NULL,
    status_filter VARCHAR(20) DEFAULT 'active',
    is_featured_filter BOOLEAN DEFAULT NULL,
    is_verified_filter BOOLEAN DEFAULT NULL,
    sort_by VARCHAR(50) DEFAULT 'relevance',
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    description TEXT,
    category VARCHAR(100),
    location VARCHAR(255),
    image_url TEXT,
    goal_amount DECIMAL,
    current_amount DECIMAL,
    donation_count INTEGER,
    progress_percentage DECIMAL,
    end_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20),
    is_featured BOOLEAN,
    is_verified BOOLEAN,
    creator_id UUID,
    creator_name TEXT,
    trust_score INTEGER,
    view_count INTEGER,
    search_rank DECIMAL,
    relevance_score REAL
) AS $$
DECLARE
    processed_search_term TEXT;
BEGIN
    -- Process search term for better matching
    processed_search_term := regexp_replace(lower(trim(search_term)), '\s+', ' & ', 'g');
    
    RETURN QUERY
    WITH searched_campaigns AS (
        SELECT 
            c.*,
            p.full_name as creator_name,
            p.trust_score,
            CASE 
                WHEN search_term IS NULL OR search_term = '' THEN 1
                ELSE ts_rank(c.search_vector, plainto_tsquery('campaign_search', processed_search_term))
            END as text_relevance,
            CASE 
                WHEN search_term IS NULL OR search_term = '' THEN 0
                ELSE similarity(lower(c.title || ' ' || COALESCE(c.description, '')), lower(search_term))
            END as fuzzy_relevance
        FROM campaigns c
        LEFT JOIN profiles p ON c.creator_id = p.id
        WHERE 
            -- Status filter
            (status_filter IS NULL OR c.status = status_filter)
            -- Category filter
            AND (category_filter IS NULL OR c.category = category_filter)
            -- Location filter
            AND (location_filter IS NULL OR c.location ILIKE '%' || location_filter || '%')
            -- Progress filters
            AND (min_progress IS NULL OR (c.current_amount / NULLIF(c.goal_amount, 0)) >= min_progress)
            AND (max_progress IS NULL OR (c.current_amount / NULLIF(c.goal_amount, 0)) <= max_progress)
            -- Amount filters
            AND (min_amount IS NULL OR c.goal_amount >= min_amount)
            AND (max_amount IS NULL OR c.goal_amount <= max_amount)
            -- Feature filters
            AND (is_featured_filter IS NULL OR c.is_featured = is_featured_filter)
            AND (is_verified_filter IS NULL OR c.is_verified = is_verified_filter)
            -- Text search
            AND (
                search_term IS NULL 
                OR search_term = ''
                OR c.search_vector @@ plainto_tsquery('campaign_search', processed_search_term)
                OR similarity(lower(c.title || ' ' || COALESCE(c.description, '')), lower(search_term)) > 0.2
            )
    )
    SELECT 
        sc.id,
        sc.title,
        sc.description,
        sc.category,
        sc.location,
        sc.image_url,
        sc.goal_amount,
        sc.current_amount,
        sc.donation_count,
        CASE 
            WHEN sc.goal_amount > 0 THEN ROUND((sc.current_amount / sc.goal_amount) * 100, 2)
            ELSE 0
        END as progress_percentage,
        sc.end_date,
        sc.status,
        sc.is_featured,
        sc.is_verified,
        sc.creator_id,
        sc.creator_name,
        sc.trust_score,
        sc.view_count,
        sc.search_rank,
        (sc.text_relevance * 0.6 + sc.fuzzy_relevance * 0.4)::REAL as relevance_score
    FROM searched_campaigns sc
    ORDER BY
        CASE 
            WHEN sort_by = 'relevance' THEN -(sc.text_relevance * 0.6 + sc.fuzzy_relevance * 0.4 + sc.search_rank * 0.2)
            WHEN sort_by = 'most_funded' THEN -sc.current_amount
            WHEN sort_by = 'recently_added' THEN -EXTRACT(EPOCH FROM sc.created_at)
            WHEN sort_by = 'ending_soon' THEN CASE 
                WHEN sc.end_date IS NOT NULL THEN EXTRACT(EPOCH FROM sc.end_date)
                ELSE 999999999
            END
            WHEN sort_by = 'most_popular' THEN -sc.donation_count
            WHEN sort_by = 'trending' THEN -sc.trending_score
            ELSE 0
        END
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to track search queries
CREATE OR REPLACE FUNCTION track_search_query(
    query_param TEXT,
    filters_param JSONB,
    result_count_param INTEGER,
    user_id_param UUID DEFAULT NULL,
    session_id_param VARCHAR DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Record search history
    INSERT INTO search_history (
        user_id,
        search_query,
        filters,
        result_count,
        session_id,
        created_at
    )
    VALUES (
        user_id_param,
        query_param,
        filters_param,
        result_count_param,
        session_id_param,
        NOW()
    );
    
    -- Update search suggestions popularity
    IF query_param IS NOT NULL AND LENGTH(query_param) > 2 THEN
        INSERT INTO search_suggestions (term, popularity)
        VALUES (lower(query_param), 1)
        ON CONFLICT (term) DO UPDATE
        SET 
            popularity = search_suggestions.popularity + 1,
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get search suggestions
CREATE OR REPLACE FUNCTION get_search_suggestions(
    input_term TEXT,
    max_suggestions INTEGER DEFAULT 10
)
RETURNS TABLE (
    suggestion TEXT,
    popularity INTEGER,
    category VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.term,
        s.popularity,
        s.category
    FROM search_suggestions s
    WHERE 
        s.term ILIKE input_term || '%'
        OR similarity(s.term, input_term) > 0.3
    ORDER BY 
        CASE WHEN s.term ILIKE input_term || '%' THEN 0 ELSE 1 END,
        s.popularity DESC,
        similarity(s.term, input_term) DESC
    LIMIT max_suggestions;
END;
$$ LANGUAGE plpgsql;

-- Function to update trending scores
CREATE OR REPLACE FUNCTION update_trending_scores()
RETURNS VOID AS $$
BEGIN
    UPDATE campaigns
    SET trending_score = (
        -- Recent donations weight
        (
            SELECT COUNT(*) 
            FROM donations d 
            WHERE d.campaign_id = campaigns.id 
            AND d.created_at > NOW() - INTERVAL '24 hours'
        ) * 0.4 +
        -- Recent views weight
        (
            SELECT COUNT(*) 
            FROM campaign_analytics_events e
            WHERE e.campaign_id = campaigns.id 
            AND e.event_type = 'view'
            AND e.created_at > NOW() - INTERVAL '24 hours'
        ) * 0.3 +
        -- Recent shares weight
        (
            SELECT COUNT(*) 
            FROM campaign_shares s
            WHERE s.campaign_id = campaigns.id 
            AND s.shared_at > NOW() - INTERVAL '24 hours'
        ) * 0.3
    )
    WHERE status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Create indexes for search performance
CREATE INDEX IF NOT EXISTS idx_campaigns_search_vector ON campaigns USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON campaigns(category);
CREATE INDEX IF NOT EXISTS idx_campaigns_location ON campaigns(location);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_featured ON campaigns(is_featured);
CREATE INDEX IF NOT EXISTS idx_campaigns_progress ON campaigns((current_amount / NULLIF(goal_amount, 0)));
CREATE INDEX IF NOT EXISTS idx_campaigns_trending ON campaigns(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_term ON search_suggestions(term);

-- Update existing campaigns to populate search vectors
UPDATE campaigns SET updated_at = NOW();

-- Create scheduled job to update trending scores (to be run hourly)
-- Note: This would typically be set up as a cron job or scheduled function

-- RLS Policies
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_suggestions ENABLE ROW LEVEL SECURITY;

-- Saved searches policies
CREATE POLICY "Users can manage their own saved searches" 
    ON saved_searches FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Search history policies
CREATE POLICY "Users can view their own search history" 
    ON search_history FOR SELECT 
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can create search history" 
    ON search_history FOR INSERT 
    WITH CHECK (true);

-- Search suggestions policies
CREATE POLICY "Everyone can view search suggestions" 
    ON search_suggestions FOR SELECT 
    USING (true);

-- Grant permissions
GRANT SELECT ON campaigns TO anon, authenticated;
GRANT SELECT ON related_campaigns TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON saved_searches TO authenticated;
GRANT SELECT, INSERT ON search_history TO anon, authenticated;
GRANT SELECT ON search_suggestions TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_campaigns TO anon, authenticated;
GRANT EXECUTE ON FUNCTION track_search_query TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_search_suggestions TO anon, authenticated;

-- Add comment
COMMENT ON SCHEMA public IS 'Advanced search and discovery with full-text search, filters, and recommendations';
