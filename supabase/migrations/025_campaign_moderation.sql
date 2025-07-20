-- Campaign Moderation Table Migration
-- Store moderation results and history for campaigns

-- Create campaign_moderation table
CREATE TABLE IF NOT EXISTS campaign_moderation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    moderation_score INTEGER NOT NULL CHECK (moderation_score >= 0 AND moderation_score <= 100),
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'review', 'rejected', 'error')),
    flags TEXT[] DEFAULT '{}',
    details JSONB DEFAULT '{}',
    recommendations TEXT[] DEFAULT '{}',
    processing_time INTEGER, -- milliseconds
    reviewed_by UUID REFERENCES auth.users(id), -- For manual reviews
    review_notes TEXT,
    moderated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_campaign_moderation_campaign_id ON campaign_moderation(campaign_id);
CREATE INDEX idx_campaign_moderation_decision ON campaign_moderation(decision);
CREATE INDEX idx_campaign_moderation_created_at ON campaign_moderation(created_at DESC);

-- Add moderation fields to campaigns table if not exists
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS moderation_score INTEGER,
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_moderation_passed BOOLEAN DEFAULT NULL;

-- Create moderation status enum if not exists
DO $$ BEGIN
    CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'under_review', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update campaign status to use the enum if needed
ALTER TABLE campaigns 
ALTER COLUMN status TYPE TEXT;

-- Row Level Security Policies
ALTER TABLE campaign_moderation ENABLE ROW LEVEL SECURITY;

-- Admin users can view all moderation records
CREATE POLICY "Admin users can view all moderation records" ON campaign_moderation
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Campaign owners can view their own moderation records
CREATE POLICY "Campaign owners can view their moderation records" ON campaign_moderation
    FOR SELECT
    TO authenticated
    USING (
        campaign_id IN (
            SELECT id FROM campaigns
            WHERE campaigns.created_by = auth.uid()
        )
    );

-- Service role can manage all moderation records
CREATE POLICY "Service role can manage moderation records" ON campaign_moderation
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Function to trigger moderation on campaign creation/update
CREATE OR REPLACE FUNCTION trigger_campaign_moderation()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger for new campaigns or significant updates
    IF (TG_OP = 'INSERT') OR 
       (TG_OP = 'UPDATE' AND (
           OLD.title IS DISTINCT FROM NEW.title OR
           OLD.story IS DISTINCT FROM NEW.story OR
           OLD.budget_breakdown IS DISTINCT FROM NEW.budget_breakdown
       )) THEN
        
        -- Set status to pending moderation
        NEW.status = 'pending';
        NEW.auto_moderation_passed = NULL;
        
        -- Call edge function asynchronously
        PERFORM net.http_post(
            url := current_setting('app.settings.supabase_url') || '/functions/v1/moderate-campaign',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_key')
            ),
            body := jsonb_build_object(
                'campaignId', NEW.id,
                'campaign', row_to_json(NEW)
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic moderation
DROP TRIGGER IF EXISTS auto_moderate_campaign ON campaigns;
CREATE TRIGGER auto_moderate_campaign
    AFTER INSERT OR UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION trigger_campaign_moderation();

-- Function to get moderation statistics
CREATE OR REPLACE FUNCTION get_moderation_stats(
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    total_moderated INTEGER,
    approved_count INTEGER,
    review_count INTEGER,
    rejected_count INTEGER,
    avg_processing_time FLOAT,
    avg_moderation_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_moderated,
        COUNT(*) FILTER (WHERE decision = 'approved')::INTEGER as approved_count,
        COUNT(*) FILTER (WHERE decision = 'review')::INTEGER as review_count,
        COUNT(*) FILTER (WHERE decision = 'rejected')::INTEGER as rejected_count,
        AVG(processing_time)::FLOAT as avg_processing_time,
        AVG(moderation_score)::FLOAT as avg_moderation_score
    FROM campaign_moderation
    WHERE moderated_at BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_moderation_stats TO authenticated;

-- Comments for documentation
COMMENT ON TABLE campaign_moderation IS 'Stores moderation results and history for campaigns';
COMMENT ON COLUMN campaign_moderation.moderation_score IS 'Overall moderation score (0-100)';
COMMENT ON COLUMN campaign_moderation.decision IS 'Moderation decision: approved, review, rejected, or error';
COMMENT ON COLUMN campaign_moderation.flags IS 'Array of flags raised during moderation';
COMMENT ON COLUMN campaign_moderation.details IS 'Detailed moderation results including matched patterns';
COMMENT ON COLUMN campaign_moderation.recommendations IS 'Recommendations for campaign improvement or review';
