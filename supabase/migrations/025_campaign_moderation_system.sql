-- Campaign Moderation System Tables
-- Stores moderation results and history for campaigns

-- Create campaign_moderation table
CREATE TABLE IF NOT EXISTS campaign_moderation (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    moderation_score DECIMAL(5,2) NOT NULL CHECK (moderation_score >= 0 AND moderation_score <= 100),
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'review', 'rejected', 'error')),
    flags TEXT[] DEFAULT '{}',
    recommendations TEXT[] DEFAULT '{}',
    details JSONB DEFAULT '{}',
    processing_time INTEGER, -- milliseconds
    moderated_at TIMESTAMPTZ DEFAULT NOW(),
    moderated_by UUID REFERENCES auth.users(id), -- NULL for automated moderation
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_campaign_moderation_campaign_id ON campaign_moderation(campaign_id);
CREATE INDEX idx_campaign_moderation_decision ON campaign_moderation(decision);
CREATE INDEX idx_campaign_moderation_moderated_at ON campaign_moderation(moderated_at DESC);
CREATE INDEX idx_campaign_moderation_score ON campaign_moderation(moderation_score);

-- Add moderation fields to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS moderation_score DECIMAL(5,2);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (moderation_status IN ('pending', 'approved', 'under_review', 'rejected'));

-- Create moderation rules table for configurable rules
CREATE TABLE IF NOT EXISTS moderation_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('luxury', 'inappropriate', 'fraud', 'trust')),
    pattern TEXT NOT NULL,
    severity INTEGER DEFAULT 1 CHECK (severity >= 1 AND severity <= 5),
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default moderation rules
INSERT INTO moderation_rules (rule_type, pattern, severity, description) VALUES
    -- Luxury patterns
    ('luxury', 'luxury|luxurious|deluxe|premium', 3, 'General luxury keywords'),
    ('luxury', 'mercedes|bmw|ferrari|lamborghini', 4, 'Luxury car brands'),
    ('luxury', 'rolex|gucci|prada|louis vuitton', 4, 'Luxury fashion brands'),
    ('luxury', 'mansion|villa|penthouse|yacht', 5, 'Luxury properties'),
    
    -- Inappropriate patterns
    ('inappropriate', 'scam|fraud|fake|hoax', 5, 'Fraud indicators'),
    ('inappropriate', 'drugs|alcohol|gambling', 4, 'Prohibited substances/activities'),
    ('inappropriate', 'weapons|guns|ammunition', 5, 'Weapons related'),
    
    -- Fraud patterns
    ('fraud', 'quick money|fast cash|guaranteed returns', 4, 'Get rich quick schemes'),
    ('fraud', 'wire transfer|western union|moneygram', 3, 'Suspicious payment methods'),
    
    -- Trust indicators
    ('trust', 'receipt|invoice|documentation', -2, 'Transparency indicators'),
    ('trust', 'God|Lord|Jesus|faith|prayer', -1, 'Faith references'),
    ('trust', 'community|family|support', -1, 'Community indicators')
ON CONFLICT DO NOTHING;

-- Create moderation queue view for admin dashboard
CREATE OR REPLACE VIEW moderation_queue AS
SELECT 
    c.id,
    c.title,
    c.need_type,
    c.goal_amount,
    c.creator_id,
    u.full_name as creator_name,
    c.created_at,
    c.moderation_status,
    c.moderation_score,
    cm.decision as latest_decision,
    cm.flags as latest_flags,
    cm.moderated_at as latest_moderation_at
FROM campaigns c
LEFT JOIN auth.users u ON c.creator_id = u.id
LEFT JOIN LATERAL (
    SELECT decision, flags, moderated_at
    FROM campaign_moderation
    WHERE campaign_id = c.id
    ORDER BY moderated_at DESC
    LIMIT 1
) cm ON true
WHERE c.moderation_status IN ('pending', 'under_review')
ORDER BY c.created_at ASC;

-- RLS Policies for moderation tables
ALTER TABLE campaign_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_rules ENABLE ROW LEVEL SECURITY;

-- Campaign moderation policies
CREATE POLICY "Admins can view all moderation results" ON campaign_moderation
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "Campaign creators can view their moderation results" ON campaign_moderation
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE id = campaign_moderation.campaign_id
            AND creator_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage moderation results" ON campaign_moderation
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Moderation rules policies (admins only)
CREATE POLICY "Admins can view moderation rules" ON moderation_rules
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage moderation rules" ON moderation_rules
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- Create function to auto-moderate new campaigns
CREATE OR REPLACE FUNCTION auto_moderate_campaign()
RETURNS TRIGGER AS $$
BEGIN
    -- Set initial moderation status
    NEW.moderation_status = 'pending';
    
    -- Could call Edge Function here for immediate moderation
    -- For now, just mark as pending
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new campaigns
CREATE TRIGGER campaign_auto_moderation
    BEFORE INSERT ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION auto_moderate_campaign();

-- Function to update campaign moderation status
CREATE OR REPLACE FUNCTION update_campaign_moderation_status(
    p_campaign_id UUID,
    p_decision VARCHAR(20),
    p_reviewer_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_new_status VARCHAR(20);
BEGIN
    -- Map decision to status
    CASE p_decision
        WHEN 'approved' THEN v_new_status := 'approved';
        WHEN 'rejected' THEN v_new_status := 'rejected';
        WHEN 'review' THEN v_new_status := 'under_review';
        ELSE v_new_status := 'pending';
    END CASE;

    -- Update campaign status
    UPDATE campaigns
    SET 
        moderation_status = v_new_status,
        moderated_at = NOW(),
        status = CASE 
            WHEN v_new_status = 'approved' THEN 'active'
            WHEN v_new_status = 'rejected' THEN 'rejected'
            ELSE status
        END
    WHERE id = p_campaign_id;

    -- Record the decision
    INSERT INTO campaign_moderation (
        campaign_id,
        decision,
        moderated_by,
        review_notes,
        moderation_score
    ) VALUES (
        p_campaign_id,
        p_decision,
        p_reviewer_id,
        p_notes,
        0 -- Will be updated by moderation service
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
