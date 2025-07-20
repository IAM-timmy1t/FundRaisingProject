-- Migration 010: Add missing RLS helper function
-- Fixes Task #4 by adding the missing can_user_create_campaign function

-- Function to check if user can create campaigns
CREATE OR REPLACE FUNCTION public.can_user_create_campaign(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Get user profile information
    SELECT 
        verified_status,
        trust_score,
        role,
        created_at,
        (SELECT COUNT(*) FROM public.campaigns WHERE recipient_id = user_id AND status != 'REJECTED') as campaign_count
    INTO user_record
    FROM public.user_profiles
    WHERE id = user_id;
    
    -- User must exist
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Admins can always create campaigns
    IF user_record.role IN ('admin', 'superadmin') THEN
        RETURN TRUE;
    END IF;
    
    -- Check verification status
    IF user_record.verified_status != 'verified' THEN
        RETURN FALSE;
    END IF;
    
    -- Check trust score (must be at least 50)
    IF user_record.trust_score < 50 THEN
        RETURN FALSE;
    END IF;
    
    -- Check if account is at least 7 days old
    IF user_record.created_at > NOW() - INTERVAL '7 days' THEN
        RETURN FALSE;
    END IF;
    
    -- Limit to 3 active campaigns per user
    IF user_record.campaign_count >= 3 THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.can_user_create_campaign TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.can_user_create_campaign IS 'Checks if a user meets requirements to create campaigns: verified status, trust score >= 50, account age >= 7 days, and less than 3 active campaigns';

-- Log migration completion
INSERT INTO public.schema_migrations (version, applied_at) 
VALUES ('010_fix_missing_rls_function', NOW()) 
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();
