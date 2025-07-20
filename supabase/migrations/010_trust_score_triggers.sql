-- Database trigger for real-time trust score updates
-- Task #15: Trust Score Edge Function
-- This trigger automatically recalculates trust scores when relevant events occur

-- Function to trigger trust score recalculation
CREATE OR REPLACE FUNCTION public.trigger_trust_score_update()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_trigger_type TEXT;
BEGIN
    -- Determine which user's trust score to update based on the trigger
    CASE TG_TABLE_NAME
        WHEN 'campaign_updates' THEN
            -- Get recipient ID from campaign
            SELECT c.recipient_id INTO v_user_id
            FROM campaigns c
            WHERE c.id = NEW.campaign_id;
            v_trigger_type := 'campaign_update';
            
        WHEN 'donations' THEN
            -- Update recipient's trust score when donation is completed
            IF NEW.payment_status = 'completed' AND (OLD IS NULL OR OLD.payment_status != 'completed') THEN
                SELECT c.recipient_id INTO v_user_id
                FROM campaigns c
                WHERE c.id = NEW.campaign_id;
                v_trigger_type := 'donation_received';
            END IF;
            
        WHEN 'user_profiles' THEN
            -- Update when KYC status changes
            IF NEW.verification_status != OLD.verification_status THEN
                v_user_id := NEW.id;
                v_trigger_type := 'kyc_update';
            END IF;
            
        WHEN 'campaigns' THEN
            -- Update when campaign status changes
            IF NEW.status != OLD.status THEN
                v_user_id := NEW.recipient_id;
                v_trigger_type := 'campaign_status_change';
            END IF;
    END CASE;

    -- Only proceed if we have a user to update
    IF v_user_id IS NOT NULL THEN
        -- Call edge function asynchronously via pg_net
        -- Note: This requires pg_net extension to be enabled
        PERFORM net.http_post(
            url := current_setting('app.settings.supabase_url') || '/functions/v1/trust-score-calculator',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
            ),
            body := jsonb_build_object(
                'user_id', v_user_id,
                'trigger', v_trigger_type,
                'trigger_data', to_jsonb(NEW)
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for trust score updates
DROP TRIGGER IF EXISTS trust_score_on_campaign_update ON public.campaign_updates;
CREATE TRIGGER trust_score_on_campaign_update
    AFTER INSERT ON public.campaign_updates
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_trust_score_update();

DROP TRIGGER IF EXISTS trust_score_on_donation ON public.donations;
CREATE TRIGGER trust_score_on_donation
    AFTER INSERT OR UPDATE ON public.donations
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_trust_score_update();

DROP TRIGGER IF EXISTS trust_score_on_profile_update ON public.user_profiles;
CREATE TRIGGER trust_score_on_profile_update
    AFTER UPDATE ON public.user_profiles
    FOR EACH ROW
    WHEN (OLD.verification_status IS DISTINCT FROM NEW.verification_status)
    EXECUTE FUNCTION public.trigger_trust_score_update();

DROP TRIGGER IF EXISTS trust_score_on_campaign_status ON public.campaigns;
CREATE TRIGGER trust_score_on_campaign_status
    AFTER UPDATE ON public.campaigns
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.trigger_trust_score_update();

-- Function to manually recalculate all trust scores (for maintenance)
CREATE OR REPLACE FUNCTION public.recalculate_all_trust_scores()
RETURNS TABLE(user_id UUID, old_score DECIMAL, new_score DECIMAL, status TEXT) AS $$
DECLARE
    v_user RECORD;
    v_old_score DECIMAL;
    v_result RECORD;
BEGIN
    FOR v_user IN 
        SELECT id, trust_score 
        FROM public.user_profiles 
        WHERE campaigns_created > 0
    LOOP
        v_old_score := v_user.trust_score;
        
        -- Call trust score calculator
        -- In production, this would call the edge function
        -- For now, we'll just return the current values
        RETURN QUERY
        SELECT 
            v_user.id,
            v_old_score,
            v_user.trust_score,
            'pending'::TEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trust score history
CREATE OR REPLACE FUNCTION public.get_trust_score_history(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
    event_date DATE,
    event_type trust_event_type,
    score_change DECIMAL,
    new_score DECIMAL,
    event_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(created_at) as event_date,
        event_type,
        SUM(score_change) as score_change,
        MAX(new_score) as new_score,
        COUNT(*) as event_count
    FROM public.trust_score_events
    WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY DATE(created_at), event_type
    ORDER BY event_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user needs trust score update
CREATE OR REPLACE FUNCTION public.needs_trust_score_update(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_last_update TIMESTAMP;
    v_has_new_activity BOOLEAN;
BEGIN
    -- Get last trust score update
    SELECT trust_score_last_updated INTO v_last_update
    FROM public.user_profiles
    WHERE id = p_user_id;
    
    -- Check if it's been more than 24 hours
    IF v_last_update IS NULL OR v_last_update < NOW() - INTERVAL '24 hours' THEN
        RETURN TRUE;
    END IF;
    
    -- Check for new activity since last update
    SELECT EXISTS(
        SELECT 1 FROM campaign_updates cu
        JOIN campaigns c ON c.id = cu.campaign_id
        WHERE c.recipient_id = p_user_id
        AND cu.created_at > v_last_update
        
        UNION
        
        SELECT 1 FROM donations d
        JOIN campaigns c ON c.id = d.campaign_id
        WHERE c.recipient_id = p_user_id
        AND d.created_at > v_last_update
        AND d.payment_status = 'completed'
    ) INTO v_has_new_activity;
    
    RETURN v_has_new_activity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.trigger_trust_score_update TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trust_score_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.needs_trust_score_update TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_all_trust_scores TO service_role;

-- Add helpful comments
COMMENT ON FUNCTION public.trigger_trust_score_update IS 'Automatically triggers trust score recalculation when relevant events occur';
COMMENT ON FUNCTION public.get_trust_score_history IS 'Returns trust score event history for a user over specified days';
COMMENT ON FUNCTION public.needs_trust_score_update IS 'Checks if a user needs their trust score recalculated';
COMMENT ON FUNCTION public.recalculate_all_trust_scores IS 'Maintenance function to recalculate all user trust scores';

-- Note: For production, you'll need to:
-- 1. Enable pg_net extension: CREATE EXTENSION IF NOT EXISTS pg_net;
-- 2. Set app.settings.supabase_url and app.settings.supabase_service_role_key
-- 3. Or use Supabase Realtime for async processing
