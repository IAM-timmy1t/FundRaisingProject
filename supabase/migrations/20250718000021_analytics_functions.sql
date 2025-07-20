-- Analytics Functions for Campaign Dashboard
-- Provides comprehensive analytics data for campaign creators

-- Function to get campaign overview stats
CREATE OR REPLACE FUNCTION get_campaign_analytics(p_campaign_id UUID, p_start_date TIMESTAMP DEFAULT NULL, p_end_date TIMESTAMP DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH campaign_stats AS (
        SELECT 
            c.id,
            c.title,
            c.goal_amount,
            c.currency,
            c.created_at,
            c.deadline,
            c.status,
            COALESCE(SUM(d.amount), 0) as total_raised,
            COUNT(DISTINCT d.donor_email) as unique_donors,
            COUNT(d.id) as total_donations,
            CASE 
                WHEN COUNT(d.id) > 0 THEN ROUND(AVG(d.amount)::numeric, 2)
                ELSE 0
            END as avg_donation,
            ROUND((COALESCE(SUM(d.amount), 0) / c.goal_amount * 100)::numeric, 2) as progress_percentage
        FROM campaigns c
        LEFT JOIN donations d ON c.id = d.campaign_id 
            AND d.status = 'completed'
            AND (p_start_date IS NULL OR d.created_at >= p_start_date)
            AND (p_end_date IS NULL OR d.created_at <= p_end_date)
        WHERE c.id = p_campaign_id
        GROUP BY c.id, c.title, c.goal_amount, c.currency, c.created_at, c.deadline, c.status
    ),
    donation_trend AS (
        SELECT 
            DATE_TRUNC('day', created_at) as date,
            COUNT(*) as donation_count,
            SUM(amount) as daily_amount
        FROM donations
        WHERE campaign_id = p_campaign_id
            AND status = 'completed'
            AND (p_start_date IS NULL OR created_at >= p_start_date)
            AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date
    ),
    donor_geography AS (
        SELECT 
            COALESCE(d.country, 'Unknown') as country,
            COUNT(*) as donor_count,
            SUM(d.amount) as total_amount
        FROM donations d
        WHERE d.campaign_id = p_campaign_id
            AND d.status = 'completed'
            AND (p_start_date IS NULL OR d.created_at >= p_start_date)
            AND (p_end_date IS NULL OR d.created_at <= p_end_date)
        GROUP BY COALESCE(d.country, 'Unknown')
        ORDER BY total_amount DESC
        LIMIT 10
    ),
    recent_donations AS (
        SELECT 
            d.id,
            d.donor_name,
            d.amount,
            d.currency,
            d.created_at,
            d.message
        FROM donations d
        WHERE d.campaign_id = p_campaign_id
            AND d.status = 'completed'
        ORDER BY d.created_at DESC
        LIMIT 10
    )
    SELECT json_build_object(
        'overview', (SELECT row_to_json(cs) FROM campaign_stats cs),
        'donation_trend', (SELECT json_agg(dt) FROM donation_trend dt),
        'donor_geography', (SELECT json_agg(dg) FROM donor_geography dg),
        'recent_donations', (SELECT json_agg(rd) FROM recent_donations rd)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get campaign traffic analytics
CREATE OR REPLACE FUNCTION get_campaign_traffic_analytics(p_campaign_id UUID, p_days_back INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH traffic_data AS (
        SELECT 
            DATE_TRUNC('day', timestamp) as date,
            COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN session_id END) as page_views,
            COUNT(DISTINCT session_id) as unique_visitors,
            COUNT(DISTINCT CASE WHEN event_type = 'donation_started' THEN session_id END) as donation_starts,
            COUNT(DISTINCT CASE WHEN event_type = 'donation_completed' THEN session_id END) as donation_completions
        FROM campaign_analytics_events
        WHERE campaign_id = p_campaign_id
            AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 day' * p_days_back
        GROUP BY DATE_TRUNC('day', timestamp)
        ORDER BY date
    ),
    traffic_sources AS (
        SELECT 
            COALESCE(referrer_source, 'Direct') as source,
            COUNT(DISTINCT session_id) as visitors,
            COUNT(DISTINCT CASE WHEN event_type = 'donation_completed' THEN session_id END) as conversions
        FROM campaign_analytics_events
        WHERE campaign_id = p_campaign_id
            AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 day' * p_days_back
            AND event_type IN ('page_view', 'donation_completed')
        GROUP BY COALESCE(referrer_source, 'Direct')
        ORDER BY visitors DESC
        LIMIT 10
    ),
    device_stats AS (
        SELECT 
            device_type,
            COUNT(DISTINCT session_id) as visitors,
            ROUND((COUNT(DISTINCT session_id)::numeric / 
                (SELECT COUNT(DISTINCT session_id) FROM campaign_analytics_events 
                 WHERE campaign_id = p_campaign_id 
                 AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 day' * p_days_back) * 100), 2) as percentage
        FROM campaign_analytics_events
        WHERE campaign_id = p_campaign_id
            AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 day' * p_days_back
        GROUP BY device_type
    )
    SELECT json_build_object(
        'daily_traffic', (SELECT json_agg(td) FROM traffic_data td),
        'traffic_sources', (SELECT json_agg(ts) FROM traffic_sources ts),
        'device_stats', (SELECT json_agg(ds) FROM device_stats ds),
        'conversion_rate', (
            SELECT ROUND(
                (COUNT(DISTINCT CASE WHEN event_type = 'donation_completed' THEN session_id END)::numeric /
                 NULLIF(COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN session_id END), 0) * 100), 2
            )
            FROM campaign_analytics_events
            WHERE campaign_id = p_campaign_id
                AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 day' * p_days_back
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get campaign engagement metrics
CREATE OR REPLACE FUNCTION get_campaign_engagement_metrics(p_campaign_id UUID, p_days_back INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH update_stats AS (
        SELECT 
            cu.id,
            cu.type,
            cu.created_at,
            COUNT(DISTINCT ue.user_id) as view_count,
            COUNT(DISTINCT CASE WHEN ue.action = 'like' THEN ue.user_id END) as like_count,
            COUNT(DISTINCT CASE WHEN ue.action = 'comment' THEN ue.user_id END) as comment_count,
            COUNT(DISTINCT CASE WHEN ue.action = 'share' THEN ue.user_id END) as share_count
        FROM campaign_updates cu
        LEFT JOIN update_engagements ue ON cu.id = ue.update_id
        WHERE cu.campaign_id = p_campaign_id
            AND cu.created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * p_days_back
        GROUP BY cu.id, cu.type, cu.created_at
        ORDER BY cu.created_at DESC
    ),
    engagement_summary AS (
        SELECT 
            COUNT(DISTINCT update_id) as total_updates,
            SUM(view_count) as total_views,
            SUM(like_count) as total_likes,
            SUM(comment_count) as total_comments,
            SUM(share_count) as total_shares,
            ROUND(AVG(view_count)::numeric, 2) as avg_views_per_update,
            ROUND(AVG(like_count)::numeric, 2) as avg_likes_per_update
        FROM update_stats
    ),
    follower_growth AS (
        SELECT 
            DATE_TRUNC('day', followed_at) as date,
            COUNT(*) as new_followers,
            SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('day', followed_at)) as cumulative_followers
        FROM campaign_followers
        WHERE campaign_id = p_campaign_id
            AND followed_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * p_days_back
        GROUP BY DATE_TRUNC('day', followed_at)
        ORDER BY date
    )
    SELECT json_build_object(
        'update_performance', (SELECT json_agg(us) FROM update_stats us),
        'engagement_summary', (SELECT row_to_json(es) FROM engagement_summary es),
        'follower_growth', (SELECT json_agg(fg) FROM follower_growth fg),
        'total_followers', (
            SELECT COUNT(*) 
            FROM campaign_followers 
            WHERE campaign_id = p_campaign_id 
            AND unfollowed_at IS NULL
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get financial analytics
CREATE OR REPLACE FUNCTION get_campaign_financial_analytics(p_campaign_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_platform_fee_percentage NUMERIC := 2.9; -- Platform fee percentage
    v_payment_processor_fee NUMERIC := 0.30; -- Fixed payment processor fee
BEGIN
    WITH donation_breakdown AS (
        SELECT 
            d.id,
            d.amount,
            d.created_at,
            -- Calculate fees
            ROUND(d.amount * (v_platform_fee_percentage / 100), 2) as platform_fee,
            v_payment_processor_fee as processor_fee,
            ROUND(d.amount - (d.amount * (v_platform_fee_percentage / 100)) - v_payment_processor_fee, 2) as net_amount
        FROM donations d
        WHERE d.campaign_id = p_campaign_id
            AND d.status = 'completed'
    ),
    monthly_revenue AS (
        SELECT 
            DATE_TRUNC('month', created_at) as month,
            SUM(amount) as gross_amount,
            SUM(platform_fee) as total_platform_fees,
            SUM(processor_fee) as total_processor_fees,
            SUM(net_amount) as total_net_amount,
            COUNT(*) as donation_count
        FROM donation_breakdown
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
    ),
    payout_history AS (
        SELECT 
            p.id,
            p.amount,
            p.status,
            p.created_at as initiated_at,
            p.completed_at,
            p.bank_reference
        FROM payouts p
        WHERE p.campaign_id = p_campaign_id
        ORDER BY p.created_at DESC
    ),
    fee_summary AS (
        SELECT 
            SUM(amount) as total_raised,
            SUM(platform_fee) as total_platform_fees,
            SUM(processor_fee) as total_processor_fees,
            SUM(net_amount) as total_net_amount,
            ROUND(AVG(platform_fee + processor_fee)::numeric, 2) as avg_fee_per_donation,
            ROUND(((SUM(platform_fee) + SUM(processor_fee)) / NULLIF(SUM(amount), 0) * 100)::numeric, 2) as effective_fee_percentage
        FROM donation_breakdown
    )
    SELECT json_build_object(
        'monthly_revenue', (SELECT json_agg(mr) FROM monthly_revenue mr),
        'payout_history', (SELECT json_agg(ph) FROM payout_history ph),
        'fee_summary', (SELECT row_to_json(fs) FROM fee_summary fs),
        'pending_payout', (
            SELECT SUM(net_amount)
            FROM donation_breakdown db
            WHERE NOT EXISTS (
                SELECT 1 FROM payouts p
                WHERE p.campaign_id = p_campaign_id
                AND p.status = 'completed'
                AND db.created_at <= p.completed_at
            )
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Create analytics event tracking table
CREATE TABLE IF NOT EXISTS campaign_analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    referrer_source VARCHAR(255),
    referrer_url TEXT,
    device_type VARCHAR(50),
    browser VARCHAR(50),
    os VARCHAR(50),
    country VARCHAR(2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create update engagements table
CREATE TABLE IF NOT EXISTS update_engagements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    update_id UUID REFERENCES campaign_updates(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('view', 'like', 'comment', 'share')),
    comment_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(update_id, user_id, action)
);

-- Create campaign followers table
CREATE TABLE IF NOT EXISTS campaign_followers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    followed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unfollowed_at TIMESTAMP WITH TIME ZONE,
    notification_enabled BOOLEAN DEFAULT true,
    UNIQUE(campaign_id, user_id)
);

-- Add country field to donations if not exists
ALTER TABLE donations ADD COLUMN IF NOT EXISTS country VARCHAR(2);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_campaign_timestamp ON campaign_analytics_events(campaign_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON campaign_analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON campaign_analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_update_engagements_update ON update_engagements(update_id);
CREATE INDEX IF NOT EXISTS idx_campaign_followers_campaign ON campaign_followers(campaign_id) WHERE unfollowed_at IS NULL;

-- Enable RLS
ALTER TABLE campaign_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_followers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Campaign owners can view their analytics events" ON campaign_analytics_events
    FOR SELECT USING (
        campaign_id IN (
            SELECT id FROM campaigns WHERE recipient_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can insert analytics events" ON campaign_analytics_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view update engagements" ON update_engagements
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own engagements" ON update_engagements
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view campaign followers" ON campaign_followers
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own follows" ON campaign_followers
    FOR ALL USING (auth.uid() = user_id);
