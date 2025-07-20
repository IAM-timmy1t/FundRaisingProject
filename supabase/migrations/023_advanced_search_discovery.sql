-- Migration: Advanced Search & Discovery Features
-- Task #23: Enable users to easily find campaigns through powerful search

-- Create search history table
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    search_query TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index for user queries
    CONSTRAINT search_history_user_query_idx UNIQUE(user_id, search_query)
);

-- Create saved searches table
CREATE TABLE IF NOT EXISTS saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    search_query TEXT,
    filters JSONB DEFAULT '{}',
    email_alerts BOOLEAN DEFAULT FALSE,
    alert_frequency VARCHAR(50) DEFAULT 'daily',
    last_alert_sent TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT saved_searches_frequency_check CHECK (alert_frequency IN ('immediate', 'daily', 'weekly'))
);

-- Create search alerts table
CREATE TABLE IF NOT EXISTS search_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saved_search_id UUID NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    alerted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate alerts
    CONSTRAINT unique_search_alert UNIQUE(saved_search_id, campaign_id)
);

-- Create campaign views table for "people also viewed"
CREATE TABLE IF NOT EXISTS campaign_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    view_duration INTEGER, -- in seconds
    referrer_campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    
    -- Index for analytics
    CONSTRAINT campaign_views_unique_session UNIQUE(campaign_id, COALESCE(user_id::text, session_id))
);

-- Create trending campaigns materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS trending_campaigns AS
SELECT 
    c.id,
    c.title,
    c.slug,
    c.current_amount,
    c.goal_amount,
    c.category,
    c.location,
    c.image_url,
    c.end_date,
    c.creator_id,
    c.is_featured,
    c.verification_status,
    
    -- Trending score calculation
    (
        -- Recent donations weight
        COALESCE((
            SELECT COUNT(*) * 10
            FROM donations d
            WHERE d.campaign_id = c.id
            AND d.created_at > NOW() - INTERVAL '24 hours'
        ), 0) +
        
        -- Recent views weight
        COALESCE((
            SELECT COUNT(*) * 2
            FROM campaign_views cv
            WHERE cv.campaign_id = c.id
            AND cv.viewed_at > NOW() - INTERVAL '24 hours'
        ), 0) +
        
        -- Recent shares weight
        COALESCE((
            SELECT COUNT(*) * 5
            FROM campaign_shares cs
            WHERE cs.campaign_id = c.id
            AND cs.shared_at > NOW() - INTERVAL '24 hours'
        ), 0) +
        
        -- Progress bonus
        CASE 
            WHEN c.current_amount > 0 AND c.goal_amount > 0 
            THEN (c.current_amount::FLOAT / c.goal_amount::FLOAT * 100)
            ELSE 0
        END +
        
        -- Featured bonus
        CASE WHEN c.is_featured THEN 50 ELSE 0 END +
        
        -- Verification bonus
        CASE WHEN c.verification_status = 'verified' THEN 20 ELSE 0 END
    ) AS trending_score,
    
    -- Additional metrics
    (SELECT COUNT(*) FROM donations WHERE campaign_id = c.id) AS total_donations,
    (SELECT COUNT(*) FROM campaign_views WHERE campaign_id = c.id) AS total_views,
    (SELECT COUNT(*) FROM campaign_shares WHERE campaign_id = c.id) AS total_shares
    
FROM campaigns c
WHERE c.status = 'active'
AND (c.end_date IS NULL OR c.end_date > NOW())
ORDER BY trending_score DESC
LIMIT 100;

-- Create indexes for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For fuzzy search
CREATE EXTENSION IF NOT EXISTS unaccent; -- For accent-insensitive search

-- Create full-text search configuration
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS campaign_search (COPY = simple);
ALTER TEXT SEARCH CONFIGURATION campaign_search
    ALTER MAPPING FOR asciiword, asciihword, hword_asciipart, word, hword, hword_part
    WITH unaccent, simple;

-- Add full-text search columns to campaigns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS search_vector tsvector,
ADD COLUMN IF NOT EXISTS location_point geography(POINT, 4326);

-- Create full-text search index
CREATE INDEX IF NOT EXISTS idx_campaigns_search_vector ON campaigns USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_campaigns_title_trgm ON campaigns USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_campaigns_description_trgm ON campaigns USING gin(description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_campaigns_location ON campaigns(location);
CREATE INDEX IF NOT EXISTS idx_campaigns_location_point ON campaigns USING gist(location_point);
CREATE INDEX IF NOT EXISTS idx_campaigns_verification ON campaigns(verification_status);
CREATE INDEX IF NOT EXISTS idx_campaigns_featured ON campaigns(is_featured);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_campaign_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('campaign_search', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('campaign_search', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('campaign_search', COALESCE(NEW.category, '')), 'C') ||
        setweight(to_tsvector('campaign_search', COALESCE(NEW.location, '')), 'C') ||
        setweight(to_tsvector('campaign_search', COALESCE(NEW.tags::text, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update search vector
CREATE TRIGGER update_campaign_search_vector_trigger
BEFORE INSERT OR UPDATE ON campaigns
FOR EACH ROW
EXECUTE FUNCTION update_campaign_search_vector();

-- Function for advanced campaign search
CREATE OR REPLACE FUNCTION search_campaigns_advanced(
    search_query TEXT DEFAULT NULL,
    category_filter VARCHAR DEFAULT NULL,
    location_filter VARCHAR DEFAULT NULL,
    status_filter VARCHAR DEFAULT NULL,
    verification_filter VARCHAR DEFAULT NULL,
    featured_filter BOOLEAN DEFAULT NULL,
    goal_min DECIMAL DEFAULT NULL,
    goal_max DECIMAL DEFAULT NULL,
    progress_min INTEGER DEFAULT NULL,
    progress_max INTEGER DEFAULT NULL,
    sort_by VARCHAR DEFAULT 'created_at',
    sort_order VARCHAR DEFAULT 'DESC',
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0,
    user_latitude FLOAT DEFAULT NULL,
    user_longitude FLOAT DEFAULT NULL,
    radius_km INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    description TEXT,
    slug VARCHAR,
    category VARCHAR,
    location VARCHAR,
    current_amount DECIMAL,
    goal_amount DECIMAL,
    progress_percentage INTEGER,
    end_date TIMESTAMP WITH TIME ZONE,
    image_url TEXT,
    creator_id UUID,
    creator_name VARCHAR,
    creator_avatar TEXT,
    is_featured BOOLEAN,
    verification_status VARCHAR,
    donation_count BIGINT,
    view_count BIGINT,
    share_count BIGINT,
    trending_score FLOAT,
    distance_km FLOAT,
    relevance_score FLOAT,
    total_results BIGINT
) AS $$
DECLARE
    total_count BIGINT;
BEGIN
    -- First, get the total count
    SELECT COUNT(*) INTO total_count
    FROM campaigns c
    WHERE 
        -- Search query
        (search_query IS NULL OR 
            (c.search_vector @@ plainto_tsquery('campaign_search', search_query) OR
             c.title ILIKE '%' || search_query || '%' OR
             c.description ILIKE '%' || search_query || '%'))
        -- Category filter
        AND (category_filter IS NULL OR c.category = category_filter)
        -- Location filter
        AND (location_filter IS NULL OR c.location ILIKE '%' || location_filter || '%')
        -- Status filter
        AND (status_filter IS NULL OR c.status = status_filter)
        -- Verification filter
        AND (verification_filter IS NULL OR c.verification_status = verification_filter)
        -- Featured filter
        AND (featured_filter IS NULL OR c.is_featured = featured_filter)
        -- Goal range filter
        AND (goal_min IS NULL OR c.goal_amount >= goal_min)
        AND (goal_max IS NULL OR c.goal_amount <= goal_max)
        -- Progress filter
        AND (progress_min IS NULL OR 
            (c.current_amount::FLOAT / NULLIF(c.goal_amount, 0) * 100) >= progress_min)
        AND (progress_max IS NULL OR 
            (c.current_amount::FLOAT / NULLIF(c.goal_amount, 0) * 100) <= progress_max)
        -- Location radius filter
        AND (user_latitude IS NULL OR user_longitude IS NULL OR radius_km IS NULL OR
            ST_DWithin(
                c.location_point,
                ST_MakePoint(user_longitude, user_latitude)::geography,
                radius_km * 1000
            ));

    -- Return results with relevance scoring
    RETURN QUERY
    WITH campaign_stats AS (
        SELECT 
            c.id AS campaign_id,
            COUNT(DISTINCT d.id) AS donation_count,
            COUNT(DISTINCT cv.id) AS view_count,
            COUNT(DISTINCT cs.id) AS share_count,
            COALESCE(tc.trending_score, 0) AS trending_score
        FROM campaigns c
        LEFT JOIN donations d ON d.campaign_id = c.id
        LEFT JOIN campaign_views cv ON cv.campaign_id = c.id
        LEFT JOIN campaign_shares cs ON cs.campaign_id = c.id
        LEFT JOIN trending_campaigns tc ON tc.id = c.id
        GROUP BY c.id, tc.trending_score
    ),
    scored_campaigns AS (
        SELECT 
            c.*,
            p.full_name AS creator_name,
            p.avatar_url AS creator_avatar,
            cs.donation_count,
            cs.view_count,
            cs.share_count,
            cs.trending_score,
            -- Calculate distance if location provided
            CASE 
                WHEN user_latitude IS NOT NULL AND user_longitude IS NOT NULL AND c.location_point IS NOT NULL
                THEN ST_Distance(
                    c.location_point,
                    ST_MakePoint(user_longitude, user_latitude)::geography
                ) / 1000 -- Convert to km
                ELSE NULL
            END AS distance_km,
            -- Calculate relevance score
            CASE 
                WHEN search_query IS NOT NULL THEN
                    ts_rank(c.search_vector, plainto_tsquery('campaign_search', search_query)) * 100 +
                    CASE WHEN c.title ILIKE '%' || search_query || '%' THEN 50 ELSE 0 END +
                    similarity(c.title, search_query) * 20
                ELSE 0
            END AS relevance_score
        FROM campaigns c
        INNER JOIN profiles p ON p.id = c.creator_id
        LEFT JOIN campaign_stats cs ON cs.campaign_id = c.id
        WHERE 
            -- Apply all filters (same as count query)
            (search_query IS NULL OR 
                (c.search_vector @@ plainto_tsquery('campaign_search', search_query) OR
                 c.title ILIKE '%' || search_query || '%' OR
                 c.description ILIKE '%' || search_query || '%'))
            AND (category_filter IS NULL OR c.category = category_filter)
            AND (location_filter IS NULL OR c.location ILIKE '%' || location_filter || '%')
            AND (status_filter IS NULL OR c.status = status_filter)
            AND (verification_filter IS NULL OR c.verification_status = verification_filter)
            AND (featured_filter IS NULL OR c.is_featured = featured_filter)
            AND (goal_min IS NULL OR c.goal_amount >= goal_min)
            AND (goal_max IS NULL OR c.goal_amount <= goal_max)
            AND (progress_min IS NULL OR 
                (c.current_amount::FLOAT / NULLIF(c.goal_amount, 0) * 100) >= progress_min)
            AND (progress_max IS NULL OR 
                (c.current_amount::FLOAT / NULLIF(c.goal_amount, 0) * 100) <= progress_max)
            AND (user_latitude IS NULL OR user_longitude IS NULL OR radius_km IS NULL OR
                ST_DWithin(
                    c.location_point,
                    ST_MakePoint(user_longitude, user_latitude)::geography,
                    radius_km * 1000
                ))
    )
    SELECT 
        sc.id,
        sc.title,
        sc.description,
        sc.slug,
        sc.category,
        sc.location,
        sc.current_amount,
        sc.goal_amount,
        CASE 
            WHEN sc.goal_amount > 0 
            THEN ROUND((sc.current_amount::FLOAT / sc.goal_amount * 100)::NUMERIC)::INTEGER
            ELSE 0
        END AS progress_percentage,
        sc.end_date,
        sc.image_url,
        sc.creator_id,
        sc.creator_name,
        sc.creator_avatar,
        sc.is_featured,
        sc.verification_status,
        sc.donation_count,
        sc.view_count,
        sc.share_count,
        sc.trending_score,
        sc.distance_km,
        sc.relevance_score,
        total_count AS total_results
    FROM scored_campaigns sc
    ORDER BY
        CASE 
            WHEN sort_by = 'relevance' AND search_query IS NOT NULL THEN sc.relevance_score
            WHEN sort_by = 'trending' THEN sc.trending_score
            WHEN sort_by = 'created_at' THEN EXTRACT(EPOCH FROM sc.created_at)
            WHEN sort_by = 'end_date' THEN EXTRACT(EPOCH FROM sc.end_date)
            WHEN sort_by = 'current_amount' THEN sc.current_amount
            WHEN sort_by = 'progress' THEN (sc.current_amount::FLOAT / NULLIF(sc.goal_amount, 0))
            WHEN sort_by = 'distance' AND sc.distance_km IS NOT NULL THEN sc.distance_km
            ELSE EXTRACT(EPOCH FROM sc.created_at)
        END DESC NULLS LAST
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get search suggestions
CREATE OR REPLACE FUNCTION get_search_suggestions(
    query_text TEXT,
    max_suggestions INTEGER DEFAULT 10
)
RETURNS TABLE (
    suggestion TEXT,
    type VARCHAR,
    score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    -- Title suggestions
    SELECT DISTINCT
        c.title AS suggestion,
        'campaign'::VARCHAR AS type,
        similarity(c.title, query_text) AS score
    FROM campaigns c
    WHERE c.status = 'active'
    AND c.title ILIKE query_text || '%'
    AND similarity(c.title, query_text) > 0.2
    
    UNION ALL
    
    -- Category suggestions
    SELECT DISTINCT
        c.category AS suggestion,
        'category'::VARCHAR AS type,
        similarity(c.category, query_text) AS score
    FROM campaigns c
    WHERE c.category ILIKE query_text || '%'
    AND similarity(c.category, query_text) > 0.2
    
    UNION ALL
    
    -- Location suggestions
    SELECT DISTINCT
        c.location AS suggestion,
        'location'::VARCHAR AS type,
        similarity(c.location, query_text) AS score
    FROM campaigns c
    WHERE c.location IS NOT NULL
    AND c.location ILIKE query_text || '%'
    AND similarity(c.location, query_text) > 0.2
    
    ORDER BY score DESC, type
    LIMIT max_suggestions;
END;
$$ LANGUAGE plpgsql;

-- Function to get related campaigns
CREATE OR REPLACE FUNCTION get_related_campaigns(
    campaign_id_param UUID,
    limit_count INTEGER DEFAULT 6
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    slug VARCHAR,
    image_url TEXT,
    current_amount DECIMAL,
    goal_amount DECIMAL,
    category VARCHAR,
    similarity_score FLOAT
) AS $$
DECLARE
    target_category VARCHAR;
    target_location VARCHAR;
    target_tags TEXT[];
BEGIN
    -- Get target campaign details
    SELECT category, location, tags
    INTO target_category, target_location, target_tags
    FROM campaigns
    WHERE id = campaign_id_param;
    
    RETURN QUERY
    WITH campaign_similarity AS (
        SELECT 
            c.id,
            c.title,
            c.slug,
            c.image_url,
            c.current_amount,
            c.goal_amount,
            c.category,
            (
                -- Category match
                CASE WHEN c.category = target_category THEN 40 ELSE 0 END +
                -- Location match
                CASE WHEN c.location = target_location THEN 20 ELSE 0 END +
                -- Tag overlap
                CASE 
                    WHEN target_tags IS NOT NULL AND c.tags IS NOT NULL 
                    THEN array_length(c.tags && target_tags, 1) * 10
                    ELSE 0
                END +
                -- Title similarity
                similarity(c.title, (SELECT title FROM campaigns WHERE id = campaign_id_param)) * 30
            ) AS similarity_score
        FROM campaigns c
        WHERE c.id != campaign_id_param
        AND c.status = 'active'
        AND (c.end_date IS NULL OR c.end_date > NOW())
    )
    SELECT 
        cs.id,
        cs.title,
        cs.slug,
        cs.image_url,
        cs.current_amount,
        cs.goal_amount,
        cs.category,
        cs.similarity_score
    FROM campaign_similarity cs
    WHERE cs.similarity_score > 0
    ORDER BY cs.similarity_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to track search history
CREATE OR REPLACE FUNCTION track_search_history(
    user_id_param UUID,
    search_query_param TEXT,
    filters_param JSONB,
    results_count_param INTEGER
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO search_history (user_id, search_query, filters, results_count)
    VALUES (user_id_param, search_query_param, filters_param, results_count_param)
    ON CONFLICT (user_id, search_query) DO UPDATE
    SET 
        filters = EXCLUDED.filters,
        results_count = EXCLUDED.results_count,
        searched_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to check and send search alerts
CREATE OR REPLACE FUNCTION check_search_alerts()
RETURNS VOID AS $$
DECLARE
    search_record RECORD;
    campaign_record RECORD;
    last_check_time TIMESTAMP WITH TIME ZONE;
BEGIN
    FOR search_record IN 
        SELECT * FROM saved_searches 
        WHERE email_alerts = TRUE
        AND (
            (alert_frequency = 'immediate') OR
            (alert_frequency = 'daily' AND (last_alert_sent IS NULL OR last_alert_sent < NOW() - INTERVAL '1 day')) OR
            (alert_frequency = 'weekly' AND (last_alert_sent IS NULL OR last_alert_sent < NOW() - INTERVAL '7 days'))
        )
    LOOP
        -- Determine last check time
        last_check_time := COALESCE(search_record.last_alert_sent, NOW() - INTERVAL '1 day');
        
        -- Find matching campaigns created since last check
        FOR campaign_record IN 
            SELECT c.* FROM search_campaigns_advanced(
                search_record.search_query,
                (search_record.filters->>'category_filter')::VARCHAR,
                (search_record.filters->>'location_filter')::VARCHAR,
                (search_record.filters->>'status_filter')::VARCHAR,
                (search_record.filters->>'verification_filter')::VARCHAR,
                (search_record.filters->>'featured_filter')::BOOLEAN,
                (search_record.filters->>'goal_min')::DECIMAL,
                (search_record.filters->>'goal_max')::DECIMAL,
                (search_record.filters->>'progress_min')::INTEGER,
                (search_record.filters->>'progress_max')::INTEGER
            ) c
            INNER JOIN campaigns camp ON camp.id = c.id
            WHERE camp.created_at > last_check_time
        LOOP
            -- Record alert
            INSERT INTO search_alerts (saved_search_id, campaign_id)
            VALUES (search_record.id, campaign_record.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
        
        -- Update last alert sent time
        UPDATE saved_searches
        SET last_alert_sent = NOW()
        WHERE id = search_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX idx_search_history_user ON search_history(user_id);
CREATE INDEX idx_search_history_date ON search_history(searched_at DESC);
CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_alerts ON saved_searches(email_alerts) WHERE email_alerts = TRUE;
CREATE INDEX idx_campaign_views_campaign ON campaign_views(campaign_id);
CREATE INDEX idx_campaign_views_user ON campaign_views(user_id);
CREATE INDEX idx_campaign_views_date ON campaign_views(viewed_at DESC);

-- Create refresh function for trending campaigns
CREATE OR REPLACE FUNCTION refresh_trending_campaigns()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY trending_campaigns;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_views ENABLE ROW LEVEL SECURITY;

-- Search history policies
CREATE POLICY "Users can view their own search history" 
    ON search_history FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own search history" 
    ON search_history FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Saved searches policies
CREATE POLICY "Users can manage their own saved searches" 
    ON saved_searches FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Search alerts policies
CREATE POLICY "Users can view their own search alerts" 
    ON search_alerts FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM saved_searches 
            WHERE saved_searches.id = search_alerts.saved_search_id 
            AND saved_searches.user_id = auth.uid()
        )
    );

-- Campaign views policies
CREATE POLICY "Anyone can create campaign views" 
    ON campaign_views FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Campaign creators can view their campaign views" 
    ON campaign_views FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM campaigns 
            WHERE campaigns.id = campaign_views.campaign_id 
            AND campaigns.creator_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT SELECT ON trending_campaigns TO authenticated, anon;
GRANT EXECUTE ON FUNCTION search_campaigns_advanced TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_search_suggestions TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_related_campaigns TO authenticated, anon;
GRANT EXECUTE ON FUNCTION track_search_history TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_trending_campaigns TO authenticated;

-- Update existing campaigns to populate search vector
UPDATE campaigns SET updated_at = NOW() WHERE search_vector IS NULL;

-- Schedule refresh of trending campaigns (would need pg_cron extension)
-- SELECT cron.schedule('refresh-trending-campaigns', '0 * * * *', 'SELECT refresh_trending_campaigns();');

-- Add comment
COMMENT ON SCHEMA public IS 'Advanced search and discovery features with full-text search, fuzzy matching, and intelligent recommendations';
