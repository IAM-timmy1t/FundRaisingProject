-- Migration 021: Analytics Dashboard Support
-- Task #21: Analytics Dashboard
-- Description: Database support for comprehensive analytics

-- Create analytics tables for aggregated data
CREATE TABLE IF NOT EXISTS public.campaign_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    
    -- Traffic metrics
    page_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    avg_time_on_page INTERVAL,
    bounce_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Donation metrics
    donation_count INTEGER DEFAULT 0,
    total_donated DECIMAL(12,2) DEFAULT 0,
    avg_donation_amount DECIMAL(10,2) DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Engagement metrics
    update_views INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    
    -- Geographic data
    visitor_countries JSONB DEFAULT '{}',
    donor_countries JSONB DEFAULT '{}',
    
    -- Traffic sources
    traffic_sources JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(campaign_id, date)
);

-- Create donor demographics table
CREATE TABLE IF NOT EXISTS public.donor_demographics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    
    -- Age groups
    age_18_24 INTEGER DEFAULT 0,
    age_25_34 INTEGER DEFAULT 0,
    age_35_44 INTEGER DEFAULT 0,
    age_45_54 INTEGER DEFAULT 0,
    age_55_64 INTEGER DEFAULT 0,
    age_65_plus INTEGER DEFAULT 0,
    age_unknown INTEGER DEFAULT 0,
    
    -- Gender distribution
    gender_male INTEGER DEFAULT 0,
    gender_female INTEGER DEFAULT 0,
    gender_other INTEGER DEFAULT 0,
    gender_unknown INTEGER DEFAULT 0,
    
    -- Donation frequency
    first_time_donors INTEGER DEFAULT 0,
    returning_donors INTEGER DEFAULT 0,
    
    -- Device types
    desktop_donors INTEGER DEFAULT 0,
    mobile_donors INTEGER DEFAULT 0,
    tablet_donors INTEGER DEFAULT 0,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create financial reports table
CREATE TABLE IF NOT EXISTS public.financial_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES auth.users(id) NOT NULL,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('monthly', 'quarterly', 'annual', 'campaign')),
    campaign_id UUID REFERENCES public.campaigns(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Revenue breakdown
    total_donations DECIMAL(12,2) DEFAULT 0,
    platform_fees DECIMAL(10,2) DEFAULT 0,
    payment_processing_fees DECIMAL(10,2) DEFAULT 0,
    net_revenue DECIMAL(12,2) DEFAULT 0,
    
    -- Payout information
    payouts_made DECIMAL(12,2) DEFAULT 0,
    payouts_pending DECIMAL(12,2) DEFAULT 0,
    
    -- Tax information
    tax_deductible_amount DECIMAL(12,2) DEFAULT 0,
    gift_aid_claimed DECIMAL(10,2) DEFAULT 0,
    
    -- Document references
    report_pdf_url TEXT,
    csv_export_url TEXT,
    
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(recipient_id, report_type, start_date, end_date, campaign_id)
);

-- Create real-time analytics events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    campaign_id UUID REFERENCES public.campaigns(id),
    user_id UUID REFERENCES auth.users(id),
    session_id UUID,
    
    -- Event details
    page_url TEXT,
    referrer_url TEXT,
    user_agent TEXT,
    ip_country VARCHAR(2),
    device_type VARCHAR(20),
    
    -- Custom event data
    event_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_campaign_analytics_campaign_date ON public.campaign_analytics(campaign_id, date DESC);
CREATE INDEX idx_campaign_analytics_date ON public.campaign_analytics(date);
CREATE INDEX idx_analytics_events_campaign ON public.analytics_events(campaign_id, created_at DESC);
CREATE INDEX idx_analytics_events_type ON public.analytics_events(event_type, created_at DESC);
CREATE INDEX idx_financial_reports_recipient ON public.financial_reports(recipient_id, report_type, end_date DESC);

-- Enable RLS
ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_analytics
CREATE POLICY "Campaign owners can view their analytics"
    ON public.campaign_analytics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_analytics.campaign_id
            AND c.recipient_id = auth.uid()
        )
    );

-- RLS Policies for donor_demographics
CREATE POLICY "Campaign owners can view donor demographics"
    ON public.donor_demographics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = donor_demographics.campaign_id
            AND c.recipient_id = auth.uid()
        )
    );

-- RLS Policies for financial_reports
CREATE POLICY "Users can view their own financial reports"
    ON public.financial_reports FOR SELECT
    USING (recipient_id = auth.uid());

-- RLS Policies for analytics_events (service role only for writes)
CREATE POLICY "Campaign owners can view their events"
    ON public.analytics_events FOR SELECT
    USING (
        campaign_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = analytics_events.campaign_id
            AND c.recipient_id = auth.uid()
        )
    );

-- Function to calculate campaign statistics
CREATE OR REPLACE FUNCTION public.calculate_campaign_stats(p_campaign_id UUID)
RETURNS TABLE (
    total_raised DECIMAL,
    donation_count BIGINT,
    unique_donors BIGINT,
    avg_donation DECIMAL,
    completion_percentage DECIMAL,
    days_remaining INTEGER,
    daily_average DECIMAL,
    largest_donation DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(d.amount), 0)::DECIMAL as total_raised,
        COUNT(d.id) as donation_count,
        COUNT(DISTINCT COALESCE(d.donor_id, d.donor_email)) as unique_donors,
        CASE 
            WHEN COUNT(d.id) > 0 THEN (SUM(d.amount) / COUNT(d.id))::DECIMAL
            ELSE 0::DECIMAL
        END as avg_donation,
        CASE 
            WHEN c.goal_amount > 0 THEN 
                LEAST((COALESCE(SUM(d.amount), 0) / c.goal_amount * 100), 100)::DECIMAL
            ELSE 0::DECIMAL
        END as completion_percentage,
        CASE 
            WHEN c.deadline > NOW() THEN 
                EXTRACT(DAY FROM c.deadline - NOW())::INTEGER
            ELSE 0
        END as days_remaining,
        CASE 
            WHEN EXTRACT(DAY FROM NOW() - c.created_at) > 0 THEN
                (COALESCE(SUM(d.amount), 0) / EXTRACT(DAY FROM NOW() - c.created_at))::DECIMAL
            ELSE COALESCE(SUM(d.amount), 0)::DECIMAL
        END as daily_average,
        COALESCE(MAX(d.amount), 0)::DECIMAL as largest_donation
    FROM public.campaigns c
    LEFT JOIN public.donations d ON d.campaign_id = c.id AND d.payment_status = 'completed'
    WHERE c.id = p_campaign_id
    GROUP BY c.id, c.goal_amount, c.deadline, c.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get time series donation data
CREATE OR REPLACE FUNCTION public.get_donation_time_series(
    p_campaign_id UUID,
    p_interval TEXT DEFAULT 'day',
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    period TIMESTAMP WITH TIME ZONE,
    donation_count BIGINT,
    total_amount DECIMAL,
    unique_donors BIGINT
) AS $$
BEGIN
    -- Set default dates if not provided
    IF p_start_date IS NULL THEN
        SELECT created_at::DATE INTO p_start_date 
        FROM public.campaigns WHERE id = p_campaign_id;
    END IF;
    
    IF p_end_date IS NULL THEN
        p_end_date := CURRENT_DATE;
    END IF;
    
    RETURN QUERY
    SELECT
        date_trunc(p_interval, d.created_at) as period,
        COUNT(d.id) as donation_count,
        COALESCE(SUM(d.amount), 0)::DECIMAL as total_amount,
        COUNT(DISTINCT COALESCE(d.donor_id, d.donor_email)) as unique_donors
    FROM public.donations d
    WHERE d.campaign_id = p_campaign_id
    AND d.payment_status = 'completed'
    AND d.created_at >= p_start_date
    AND d.created_at <= p_end_date + INTERVAL '1 day'
    GROUP BY period
    ORDER BY period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track analytics event
CREATE OR REPLACE FUNCTION public.track_analytics_event(
    p_event_type VARCHAR(50),
    p_campaign_id UUID DEFAULT NULL,
    p_session_id UUID DEFAULT NULL,
    p_page_url TEXT DEFAULT NULL,
    p_referrer_url TEXT DEFAULT NULL,
    p_event_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO public.analytics_events (
        event_type,
        campaign_id,
        user_id,
        session_id,
        page_url,
        referrer_url,
        event_data
    ) VALUES (
        p_event_type,
        p_campaign_id,
        auth.uid(),
        p_session_id,
        p_page_url,
        p_referrer_url,
        p_event_data
    ) RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to aggregate daily analytics
CREATE OR REPLACE FUNCTION public.aggregate_daily_analytics()
RETURNS void AS $$
DECLARE
    v_campaign RECORD;
    v_date DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
    -- Loop through all active campaigns
    FOR v_campaign IN 
        SELECT id FROM public.campaigns 
        WHERE status IN ('FUNDING', 'FUNDED', 'COMPLETED')
    LOOP
        -- Insert or update campaign analytics
        INSERT INTO public.campaign_analytics (
            campaign_id,
            date,
            page_views,
            unique_visitors,
            donation_count,
            total_donated,
            avg_donation_amount,
            conversion_rate,
            update_views,
            comments_count,
            shares_count,
            favorites_count
        )
        SELECT
            v_campaign.id,
            v_date,
            COUNT(DISTINCT CASE WHEN e.event_type = 'page_view' THEN e.id END),
            COUNT(DISTINCT CASE WHEN e.event_type = 'page_view' THEN e.session_id END),
            COUNT(DISTINCT CASE WHEN d.created_at::DATE = v_date THEN d.id END),
            COALESCE(SUM(CASE WHEN d.created_at::DATE = v_date THEN d.amount END), 0),
            COALESCE(AVG(CASE WHEN d.created_at::DATE = v_date THEN d.amount END), 0),
            CASE 
                WHEN COUNT(DISTINCT CASE WHEN e.event_type = 'page_view' THEN e.session_id END) > 0 THEN
                    (COUNT(DISTINCT CASE WHEN d.created_at::DATE = v_date THEN d.session_id END)::DECIMAL / 
                     COUNT(DISTINCT CASE WHEN e.event_type = 'page_view' THEN e.session_id END) * 100)
                ELSE 0
            END,
            COUNT(DISTINCT CASE WHEN e.event_type = 'update_view' THEN e.id END),
            COUNT(DISTINCT CASE WHEN cc.created_at::DATE = v_date THEN cc.id END),
            COUNT(DISTINCT CASE WHEN e.event_type = 'share' THEN e.id END),
            COUNT(DISTINCT CASE WHEN uf.created_at::DATE = v_date THEN uf.id END)
        FROM public.campaigns c
        LEFT JOIN public.analytics_events e ON e.campaign_id = c.id 
            AND e.created_at::DATE = v_date
        LEFT JOIN public.donations d ON d.campaign_id = c.id 
            AND d.payment_status = 'completed'
        LEFT JOIN public.campaign_comments cc ON cc.campaign_id = c.id
        LEFT JOIN public.user_favorites uf ON uf.campaign_id = c.id
        WHERE c.id = v_campaign.id
        GROUP BY c.id
        ON CONFLICT (campaign_id, date) DO UPDATE SET
            page_views = EXCLUDED.page_views,
            unique_visitors = EXCLUDED.unique_visitors,
            donation_count = EXCLUDED.donation_count,
            total_donated = EXCLUDED.total_donated,
            avg_donation_amount = EXCLUDED.avg_donation_amount,
            conversion_rate = EXCLUDED.conversion_rate,
            update_views = EXCLUDED.update_views,
            comments_count = EXCLUDED.comments_count,
            shares_count = EXCLUDED.shares_count,
            favorites_count = EXCLUDED.favorites_count,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.calculate_campaign_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_donation_time_series TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_analytics_event TO authenticated;

-- Create cron job for daily aggregation (requires pg_cron extension)
-- This would be set up in Supabase dashboard or via SQL if pg_cron is enabled
-- SELECT cron.schedule('aggregate-daily-analytics', '0 2 * * *', 'SELECT public.aggregate_daily_analytics();');

-- Insert migration record
INSERT INTO public.schema_migrations (version, applied_at) 
VALUES ('021_analytics_dashboard', NOW()) 
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();

COMMENT ON TABLE public.campaign_analytics IS 'Daily aggregated analytics data for campaigns';
COMMENT ON TABLE public.donor_demographics IS 'Demographic information about campaign donors';
COMMENT ON TABLE public.financial_reports IS 'Financial reports for recipients';
COMMENT ON TABLE public.analytics_events IS 'Raw analytics events for real-time tracking';
COMMENT ON FUNCTION public.calculate_campaign_stats IS 'Calculate comprehensive statistics for a campaign';
COMMENT ON FUNCTION public.get_donation_time_series IS 'Get time series data for campaign donations';
COMMENT ON FUNCTION public.track_analytics_event IS 'Track analytics events for campaigns';
