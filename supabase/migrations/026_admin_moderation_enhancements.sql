-- Admin moderation enhancements
-- Adds features for admin moderation tracking and analytics

-- Create admin_actions table for audit trail
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_target ON admin_actions(target_type, target_id);
CREATE INDEX idx_admin_actions_created_at ON admin_actions(created_at DESC);

-- Add manual_review_notes to campaign_moderation if not exists
ALTER TABLE campaign_moderation 
ADD COLUMN IF NOT EXISTS manual_review_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Create moderation_analytics view for dashboard stats
CREATE OR REPLACE VIEW moderation_analytics AS
SELECT 
    DATE(cm.moderated_at) as moderation_date,
    COUNT(*) as total_moderated,
    COUNT(CASE WHEN cm.decision = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN cm.decision = 'rejected' THEN 1 END) as rejected_count,
    COUNT(CASE WHEN cm.decision = 'review' THEN 1 END) as review_count,
    AVG(cm.moderation_score) as avg_score,
    AVG(cm.processing_time) as avg_processing_time,
    COUNT(DISTINCT cm.reviewed_by) as unique_reviewers
FROM campaign_moderation cm
WHERE cm.moderated_at IS NOT NULL
GROUP BY DATE(cm.moderated_at)
ORDER BY moderation_date DESC;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_id UUID,
    p_action_type TEXT,
    p_target_type TEXT,
    p_target_id UUID,
    p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_action_id UUID;
BEGIN
    INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
    VALUES (p_admin_id, p_action_type, p_target_type, p_target_id, p_details)
    RETURNING id INTO v_action_id;
    
    RETURN v_action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to log campaign moderation actions
CREATE OR REPLACE FUNCTION log_campaign_moderation_action()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log manual reviews (when reviewed_by is set)
    IF NEW.reviewed_by IS NOT NULL AND (OLD IS NULL OR OLD.reviewed_by IS NULL) THEN
        PERFORM log_admin_action(
            NEW.reviewed_by,
            'campaign_moderation',
            'campaign',
            NEW.campaign_id,
            jsonb_build_object(
                'decision', NEW.decision,
                'score', NEW.moderation_score,
                'flags', NEW.flags,
                'notes', NEW.review_notes
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for campaign moderation logging
DROP TRIGGER IF EXISTS tr_log_campaign_moderation ON campaign_moderation;
CREATE TRIGGER tr_log_campaign_moderation
    AFTER INSERT OR UPDATE ON campaign_moderation
    FOR EACH ROW
    EXECUTE FUNCTION log_campaign_moderation_action();

-- Function to get moderation workload stats
CREATE OR REPLACE FUNCTION get_moderation_workload_stats()
RETURNS TABLE (
    admin_id UUID,
    admin_email TEXT,
    campaigns_reviewed_today INTEGER,
    campaigns_reviewed_week INTEGER,
    avg_review_time_today INTERVAL,
    approval_rate_today NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cm.reviewed_by as admin_id,
        au.email as admin_email,
        COUNT(CASE WHEN DATE(cm.moderated_at) = CURRENT_DATE THEN 1 END)::INTEGER as campaigns_reviewed_today,
        COUNT(CASE WHEN cm.moderated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END)::INTEGER as campaigns_reviewed_week,
        AVG(CASE 
            WHEN DATE(cm.moderated_at) = CURRENT_DATE 
            THEN cm.reviewed_at - cm.moderated_at 
        END) as avg_review_time_today,
        CASE 
            WHEN COUNT(CASE WHEN DATE(cm.moderated_at) = CURRENT_DATE THEN 1 END) > 0
            THEN (COUNT(CASE WHEN DATE(cm.moderated_at) = CURRENT_DATE AND cm.decision = 'approved' THEN 1 END)::NUMERIC / 
                  COUNT(CASE WHEN DATE(cm.moderated_at) = CURRENT_DATE THEN 1 END)::NUMERIC * 100)
            ELSE 0
        END as approval_rate_today
    FROM campaign_moderation cm
    LEFT JOIN auth.users au ON au.id = cm.reviewed_by
    WHERE cm.reviewed_by IS NOT NULL
    GROUP BY cm.reviewed_by, au.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies for admin_actions
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Admins can view all admin actions
CREATE POLICY "Admins can view all admin actions" ON admin_actions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Grant necessary permissions
GRANT SELECT ON moderation_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_moderation_workload_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action TO authenticated;
