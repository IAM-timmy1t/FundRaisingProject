-- Migration: Social Sharing Features
-- Task #22: Enable viral campaign sharing across social platforms

-- Create campaign_shares table to track social shares
CREATE TABLE IF NOT EXISTS campaign_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    platform VARCHAR(50) NOT NULL,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    
    -- Indexes for performance
    CONSTRAINT campaign_shares_platform_check CHECK (platform IN ('facebook', 'twitter', 'linkedin', 'whatsapp', 'telegram', 'email', 'copy', 'other'))
);

-- Create indexes for campaign_shares
CREATE INDEX idx_campaign_shares_campaign ON campaign_shares(campaign_id);
CREATE INDEX idx_campaign_shares_user ON campaign_shares(user_id);
CREATE INDEX idx_campaign_shares_platform ON campaign_shares(platform);
CREATE INDEX idx_campaign_shares_date ON campaign_shares(shared_at);

-- Create share_conversions table to track share-to-donation conversions
CREATE TABLE IF NOT EXISTS share_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    referral_source VARCHAR(100) NOT NULL,
    donation_id UUID REFERENCES donations(id) ON DELETE CASCADE,
    converted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    conversion_value DECIMAL(10, 2),
    
    -- Track the share that led to this conversion
    share_id UUID REFERENCES campaign_shares(id) ON DELETE SET NULL
);

-- Create indexes for share_conversions
CREATE INDEX idx_share_conversions_campaign ON share_conversions(campaign_id);
CREATE INDEX idx_share_conversions_source ON share_conversions(referral_source);
CREATE INDEX idx_share_conversions_donation ON share_conversions(donation_id);

-- Create campaign_milestones table for share milestones
CREATE TABLE IF NOT EXISTS campaign_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    milestone_type VARCHAR(50) NOT NULL,
    milestone_value INTEGER NOT NULL,
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notification_sent BOOLEAN DEFAULT FALSE,
    
    -- Ensure unique milestones per campaign
    CONSTRAINT unique_campaign_milestone UNIQUE(campaign_id, milestone_type, milestone_value),
    CONSTRAINT campaign_milestones_type_check CHECK (milestone_type IN ('shares', 'donations', 'amount', 'supporters'))
);

-- Create share_rewards table for tracking unlocked rewards
CREATE TABLE IF NOT EXISTS share_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reward_type VARCHAR(100) NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    claimed_at TIMESTAMP WITH TIME ZONE,
    reward_data JSONB,
    
    -- Ensure unique rewards per user per campaign
    CONSTRAINT unique_user_campaign_reward UNIQUE(campaign_id, user_id, reward_type)
);

-- Create embed_analytics table to track embed usage
CREATE TABLE IF NOT EXISTS embed_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    embed_type VARCHAR(50) NOT NULL,
    domain VARCHAR(255),
    page_url TEXT,
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique embeds per domain
    CONSTRAINT unique_campaign_domain_embed UNIQUE(campaign_id, domain, embed_type),
    CONSTRAINT embed_analytics_type_check CHECK (embed_type IN ('widget', 'progress', 'button'))
);

-- Add social sharing fields to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS viral_coefficient DECIMAL(4, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS social_preview_image TEXT,
ADD COLUMN IF NOT EXISTS share_incentives_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS custom_share_message TEXT;

-- Function to update campaign share count
CREATE OR REPLACE FUNCTION update_campaign_share_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the share count on the campaign
    UPDATE campaigns 
    SET share_count = (
        SELECT COUNT(*) 
        FROM campaign_shares 
        WHERE campaign_id = NEW.campaign_id
    )
    WHERE id = NEW.campaign_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update share count
CREATE TRIGGER update_share_count_trigger
AFTER INSERT ON campaign_shares
FOR EACH ROW
EXECUTE FUNCTION update_campaign_share_count();

-- Function to calculate viral coefficient
CREATE OR REPLACE FUNCTION calculate_viral_coefficient(campaign_id_param UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_shares INTEGER;
    total_conversions INTEGER;
    unique_sharers INTEGER;
    coefficient DECIMAL;
BEGIN
    -- Get total shares
    SELECT COUNT(*) INTO total_shares
    FROM campaign_shares
    WHERE campaign_id = campaign_id_param;
    
    -- Get total conversions from shares
    SELECT COUNT(*) INTO total_conversions
    FROM share_conversions
    WHERE campaign_id = campaign_id_param;
    
    -- Get unique sharers
    SELECT COUNT(DISTINCT user_id) INTO unique_sharers
    FROM campaign_shares
    WHERE campaign_id = campaign_id_param
    AND user_id IS NOT NULL;
    
    -- Calculate viral coefficient
    IF unique_sharers > 0 THEN
        coefficient := total_conversions::DECIMAL / unique_sharers::DECIMAL;
    ELSE
        coefficient := 0;
    END IF;
    
    -- Update campaign
    UPDATE campaigns 
    SET viral_coefficient = coefficient
    WHERE id = campaign_id_param;
    
    RETURN coefficient;
END;
$$ LANGUAGE plpgsql;

-- Function to track referral source from URL parameters
CREATE OR REPLACE FUNCTION track_referral_source(
    campaign_id_param UUID,
    referral_source_param VARCHAR,
    session_id_param VARCHAR
)
RETURNS VOID AS $$
BEGIN
    -- Store referral source in session for later conversion tracking
    INSERT INTO campaign_sessions (campaign_id, session_id, referral_source, created_at)
    VALUES (campaign_id_param, session_id_param, referral_source_param, NOW())
    ON CONFLICT (session_id) DO UPDATE
    SET referral_source = referral_source_param,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create campaign_sessions table for tracking referrals
CREATE TABLE IF NOT EXISTS campaign_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    referral_source VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE campaign_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE embed_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_sessions ENABLE ROW LEVEL SECURITY;

-- Campaign shares policies
CREATE POLICY "Campaign shares are viewable by everyone" 
    ON campaign_shares FOR SELECT 
    USING (true);

CREATE POLICY "Users can create their own shares" 
    ON campaign_shares FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Share conversions policies (read-only for campaign creators)
CREATE POLICY "Campaign creators can view conversions" 
    ON share_conversions FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM campaigns 
            WHERE campaigns.id = share_conversions.campaign_id 
            AND campaigns.creator_id = auth.uid()
        )
    );

-- Campaign milestones policies
CREATE POLICY "Milestones are viewable by everyone" 
    ON campaign_milestones FOR SELECT 
    USING (true);

-- Share rewards policies
CREATE POLICY "Users can view their own rewards" 
    ON share_rewards FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can claim their own rewards" 
    ON share_rewards FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Embed analytics policies (campaign creators only)
CREATE POLICY "Campaign creators can view embed analytics" 
    ON embed_analytics FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM campaigns 
            WHERE campaigns.id = embed_analytics.campaign_id 
            AND campaigns.creator_id = auth.uid()
        )
    );

-- Campaign sessions policies (system use only)
CREATE POLICY "Campaign sessions are system managed" 
    ON campaign_sessions FOR ALL 
    USING (false);

-- Grant necessary permissions
GRANT SELECT ON campaign_shares TO authenticated, anon;
GRANT INSERT ON campaign_shares TO authenticated, anon;
GRANT SELECT ON share_conversions TO authenticated;
GRANT SELECT ON campaign_milestones TO authenticated, anon;
GRANT SELECT, UPDATE ON share_rewards TO authenticated;
GRANT SELECT ON embed_analytics TO authenticated;

-- Create view for share statistics
CREATE OR REPLACE VIEW campaign_share_stats AS
SELECT 
    c.id as campaign_id,
    c.title as campaign_title,
    COUNT(DISTINCT cs.id) as total_shares,
    COUNT(DISTINCT cs.user_id) as unique_sharers,
    COUNT(DISTINCT cs.platform) as platforms_used,
    COUNT(DISTINCT sc.id) as total_conversions,
    COALESCE(SUM(sc.conversion_value), 0) as conversion_value,
    c.viral_coefficient,
    MAX(cs.shared_at) as last_shared_at,
    
    -- Platform breakdown
    COUNT(CASE WHEN cs.platform = 'facebook' THEN 1 END) as facebook_shares,
    COUNT(CASE WHEN cs.platform = 'twitter' THEN 1 END) as twitter_shares,
    COUNT(CASE WHEN cs.platform = 'linkedin' THEN 1 END) as linkedin_shares,
    COUNT(CASE WHEN cs.platform = 'whatsapp' THEN 1 END) as whatsapp_shares,
    COUNT(CASE WHEN cs.platform = 'telegram' THEN 1 END) as telegram_shares,
    COUNT(CASE WHEN cs.platform = 'email' THEN 1 END) as email_shares,
    COUNT(CASE WHEN cs.platform = 'copy' THEN 1 END) as link_copies
FROM campaigns c
LEFT JOIN campaign_shares cs ON c.id = cs.campaign_id
LEFT JOIN share_conversions sc ON c.id = sc.campaign_id
GROUP BY c.id, c.title, c.viral_coefficient;

-- Grant access to the view
GRANT SELECT ON campaign_share_stats TO authenticated;

-- Add comment
COMMENT ON SCHEMA public IS 'Social sharing features for viral campaign growth with tracking, incentives, and embeds';