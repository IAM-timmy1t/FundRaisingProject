-- Migration: Embed Tracking Functions
-- Task #22: Add RPC functions for embed analytics tracking

-- Function to track embed views
CREATE OR REPLACE FUNCTION track_embed_view(
    campaign_id_param UUID,
    embed_type_param VARCHAR(50),
    domain_param VARCHAR(255),
    page_url_param TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Insert or update embed analytics
    INSERT INTO embed_analytics (
        campaign_id,
        embed_type,
        domain,
        page_url,
        views,
        created_at,
        last_viewed_at
    )
    VALUES (
        campaign_id_param,
        embed_type_param,
        domain_param,
        page_url_param,
        1,
        NOW(),
        NOW()
    )
    ON CONFLICT (campaign_id, domain, embed_type) DO UPDATE
    SET 
        views = embed_analytics.views + 1,
        last_viewed_at = NOW(),
        page_url = EXCLUDED.page_url;
    
    -- Track in analytics events
    INSERT INTO campaign_analytics_events (
        campaign_id,
        event_type,
        event_data,
        created_at
    )
    VALUES (
        campaign_id_param,
        'embed_view',
        jsonb_build_object(
            'embed_type', embed_type_param,
            'domain', domain_param,
            'page_url', page_url_param
        ),
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track embed clicks
CREATE OR REPLACE FUNCTION track_embed_click(
    campaign_id_param UUID,
    embed_type_param VARCHAR(50)
)
RETURNS VOID AS $$
DECLARE
    domain_var VARCHAR(255);
BEGIN
    -- Get the domain from the referrer or use a default
    domain_var := COALESCE(
        current_setting('request.headers', true)::json->>'referer',
        'unknown'
    );
    
    -- Update click count
    UPDATE embed_analytics 
    SET clicks = clicks + 1
    WHERE campaign_id = campaign_id_param
    AND embed_type = embed_type_param
    AND domain = domain_var;
    
    -- Track in analytics events
    INSERT INTO campaign_analytics_events (
        campaign_id,
        event_type,
        event_data,
        created_at
    )
    VALUES (
        campaign_id_param,
        'embed_click',
        jsonb_build_object(
            'embed_type', embed_type_param,
            'domain', domain_var
        ),
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get embed analytics for a campaign
CREATE OR REPLACE FUNCTION get_embed_analytics(campaign_id_param UUID)
RETURNS TABLE (
    embed_type VARCHAR(50),
    domain VARCHAR(255),
    page_url TEXT,
    views INTEGER,
    clicks INTEGER,
    conversions INTEGER,
    click_rate DECIMAL,
    conversion_rate DECIMAL,
    last_viewed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ea.embed_type,
        ea.domain,
        ea.page_url,
        ea.views,
        ea.clicks,
        ea.conversions,
        CASE 
            WHEN ea.views > 0 THEN ROUND((ea.clicks::DECIMAL / ea.views::DECIMAL) * 100, 2)
            ELSE 0
        END as click_rate,
        CASE 
            WHEN ea.clicks > 0 THEN ROUND((ea.conversions::DECIMAL / ea.clicks::DECIMAL) * 100, 2)
            ELSE 0
        END as conversion_rate,
        ea.last_viewed_at
    FROM embed_analytics ea
    WHERE ea.campaign_id = campaign_id_param
    ORDER BY ea.views DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track embed conversions (when donation is made from embed)
CREATE OR REPLACE FUNCTION track_embed_conversion(
    campaign_id_param UUID,
    embed_type_param VARCHAR(50),
    domain_param VARCHAR(255),
    donation_id_param UUID
)
RETURNS VOID AS $$
BEGIN
    -- Update conversion count
    UPDATE embed_analytics 
    SET conversions = conversions + 1
    WHERE campaign_id = campaign_id_param
    AND embed_type = embed_type_param
    AND domain = domain_param;
    
    -- Track in analytics events
    INSERT INTO campaign_analytics_events (
        campaign_id,
        event_type,
        event_data,
        created_at
    )
    VALUES (
        campaign_id_param,
        'embed_conversion',
        jsonb_build_object(
            'embed_type', embed_type_param,
            'domain', domain_param,
            'donation_id', donation_id_param
        ),
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION track_embed_view TO anon, authenticated;
GRANT EXECUTE ON FUNCTION track_embed_click TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_embed_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION track_embed_conversion TO anon, authenticated;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_embed_analytics_last_viewed 
ON embed_analytics(last_viewed_at DESC);

-- Add comment
COMMENT ON SCHEMA public IS 'Embed tracking functions for monitoring widget performance across external sites';
