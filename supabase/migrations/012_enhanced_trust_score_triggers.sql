-- Migration 012: Enhanced Trust Score Triggers
-- Task #15: Trust Score Edge Function - Real-time updates
-- Description: Fixed triggers and alternative implementation for trust score updates

-- First, drop the old trigger function to replace it
DROP FUNCTION IF EXISTS public.trigger_trust_score_update() CASCADE;

-- Create a function to queue trust score updates
CREATE TABLE IF NOT EXISTS public.trust_score_update_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    trigger_type TEXT NOT NULL,
    trigger_data JSONB,
    status TEXT DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on the queue table
ALTER TABLE public.trust_score_update_queue ENABLE ROW LEVEL SECURITY;

-- Only service role can access the queue
CREATE POLICY "trust_queue_service_only"
    ON public.trust_score_update_queue FOR ALL
    USING (auth.role() = 'service_role');

-- Function to queue trust score updates
CREATE OR REPLACE FUNCTION public.queue_trust_score_update(
    p_user_id UUID,
    p_trigger_type TEXT,
    p_trigger_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_queue_id UUID;
BEGIN
    INSERT INTO public.trust_score_update_queue (
        user_id,
        trigger_type,
        trigger_data
    ) VALUES (
        p_user_id,
        p_trigger_type,
        p_trigger_data
    ) RETURNING id INTO v_queue_id;
    
    -- Notify the edge function via Postgres NOTIFY
    PERFORM pg_notify('trust_score_update', jsonb_build_object(
        'queue_id', v_queue_id,
        'user_id', p_user_id,
        'trigger_type', p_trigger_type
    )::text);
    
    RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated trigger function that queues updates
CREATE OR REPLACE FUNCTION public.trigger_trust_score_update()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_trigger_type TEXT;
    v_trigger_data JSONB;
BEGIN
    -- Determine which user's trust score to update based on the trigger
    CASE TG_TABLE_NAME
        WHEN 'campaign_updates' THEN
            -- Get recipient ID from campaign
            SELECT c.recipient_id INTO v_user_id
            FROM campaigns c
            WHERE c.id = NEW.campaign_id;
            v_trigger_type := 'campaign_update';
            v_trigger_data := jsonb_build_object(
                'update_id', NEW.id,
                'campaign_id', NEW.campaign_id,
                'has_receipt', NEW.payment_reference IS NOT NULL,
                'spend_amount', NEW.spend_amount_tagged
            );
            
        WHEN 'donations' THEN
            -- Update recipient's trust score when donation is completed
            IF NEW.payment_status = 'completed' AND (OLD IS NULL OR OLD.payment_status != 'completed') THEN
                SELECT c.recipient_id INTO v_user_id
                FROM campaigns c
                WHERE c.id = NEW.campaign_id;
                v_trigger_type := 'donation_received';
                v_trigger_data := jsonb_build_object(
                    'donation_id', NEW.id,
                    'amount', NEW.amount,
                    'is_anonymous', NEW.is_anonymous
                );
            END IF;
            
        WHEN 'user_profiles' THEN
            -- Update when KYC status changes
            IF NEW.verification_status != OLD.verification_status THEN
                v_user_id := NEW.id;
                v_trigger_type := 'kyc_update';
                v_trigger_data := jsonb_build_object(
                    'old_status', OLD.verification_status,
                    'new_status', NEW.verification_status
                );
            END IF;
            
        WHEN 'campaigns' THEN
            -- Update when campaign status changes
            IF NEW.status != OLD.status THEN
                v_user_id := NEW.recipient_id;
                v_trigger_type := 'campaign_status_change';
                v_trigger_data := jsonb_build_object(
                    'campaign_id', NEW.id,
                    'old_status', OLD.status,
                    'new_status', NEW.status
                );
            END IF;
    END CASE;

    -- Queue the update if we have a user to update
    IF v_user_id IS NOT NULL THEN
        PERFORM public.queue_trust_score_update(v_user_id, v_trigger_type, v_trigger_data);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create an immediate trust score calculation function
-- This can be called directly instead of going through the edge function
CREATE OR REPLACE FUNCTION public.calculate_trust_score_immediate(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_metrics JSONB;
    v_trust_score DECIMAL;
    v_trust_tier TEXT;
    v_old_score DECIMAL;
BEGIN
    -- Get current score
    SELECT trust_score INTO v_old_score
    FROM user_profiles
    WHERE id = p_user_id;
    
    -- Calculate metrics using the same logic as the edge function
    WITH campaign_data AS (
        SELECT 
            c.id,
            c.need_type,
            c.created_at,
            c.status,
            c.overdue_updates_count,
            COUNT(cu.id) as update_count,
            MAX(cu.created_at) as latest_update,
            SUM(cu.spend_amount_tagged) as total_spend_tagged,
            SUM(CASE WHEN cu.payment_reference IS NOT NULL OR cu.update_type = 'RECEIPT' 
                THEN cu.spend_amount_tagged ELSE 0 END) as spend_with_proof
        FROM campaigns c
        LEFT JOIN campaign_updates cu ON c.id = cu.campaign_id
        WHERE c.recipient_id = p_user_id
        GROUP BY c.id
    ),
    donor_feedback AS (
        SELECT 
            AVG(d.donor_feedback_rating) as avg_rating,
            COUNT(d.donor_feedback_rating) as feedback_count
        FROM donations d
        JOIN campaigns c ON d.campaign_id = c.id
        WHERE c.recipient_id = p_user_id
        AND d.donor_feedback_rating IS NOT NULL
    ),
    profile_data AS (
        SELECT 
            verification_status,
            created_at
        FROM user_profiles
        WHERE id = p_user_id
    )
    SELECT jsonb_build_object(
        'updateTimeliness', COALESCE(
            (SELECT 
                CASE 
                    WHEN COUNT(*) = 0 THEN 50
                    ELSE AVG(
                        CASE 
                            WHEN status IN ('FUNDING', 'FUNDED') AND latest_update IS NOT NULL THEN
                                CASE 
                                    WHEN EXTRACT(DAY FROM NOW() - latest_update) <= 
                                         CASE need_type WHEN 'EMERGENCY' THEN 7 ELSE 14 END 
                                    THEN 90
                                    WHEN EXTRACT(DAY FROM NOW() - latest_update) <= 
                                         CASE need_type WHEN 'EMERGENCY' THEN 10 ELSE 21 END 
                                    THEN 75
                                    ELSE 60
                                END
                            ELSE 50
                        END - (overdue_updates_count * 20)
                    )
                END
            FROM campaign_data), 50
        ),
        'spendProofAccuracy', COALESCE(
            (SELECT 
                CASE 
                    WHEN SUM(total_spend_tagged) = 0 THEN 30
                    ELSE (SUM(spend_with_proof) / SUM(total_spend_tagged)) * 100
                END
            FROM campaign_data), 30
        ),
        'donorSentiment', COALESCE(
            (SELECT 
                CASE 
                    WHEN feedback_count = 0 THEN 70
                    ELSE avg_rating * 20
                END
            FROM donor_feedback), 70
        ),
        'kycDepth', (
            SELECT 
                CASE verification_status
                    WHEN 'unverified' THEN 0
                    WHEN 'email_verified' THEN 20
                    WHEN 'phone_verified' THEN 40
                    WHEN 'id_verified' THEN 70
                    WHEN 'kyc_full' THEN 100
                    ELSE 0
                END
            FROM profile_data
        ),
        'anomalyScore', 100 -- Simplified for immediate calculation
    ) INTO v_metrics;
    
    -- Calculate weighted score
    v_trust_score := (
        (v_metrics->>'updateTimeliness')::DECIMAL * 0.40 +
        (v_metrics->>'spendProofAccuracy')::DECIMAL * 0.30 +
        (v_metrics->>'donorSentiment')::DECIMAL * 0.15 +
        (v_metrics->>'kycDepth')::DECIMAL * 0.10 +
        (v_metrics->>'anomalyScore')::DECIMAL * 0.05
    );
    
    -- Determine tier
    v_trust_tier := CASE 
        WHEN v_trust_score >= 90 THEN 'STAR'
        WHEN v_trust_score >= 75 THEN 'TRUSTED'
        WHEN v_trust_score >= 50 THEN 'STEADY'
        WHEN v_trust_score >= 25 THEN 'RISING'
        ELSE 'NEW'
    END;
    
    -- Update user profile
    UPDATE user_profiles
    SET 
        trust_score = v_trust_score,
        trust_tier = v_trust_tier,
        trust_score_last_updated = NOW()
    WHERE id = p_user_id;
    
    -- Log trust score event
    INSERT INTO trust_score_events (
        user_id,
        event_type,
        old_score,
        new_score,
        metrics_snapshot
    ) VALUES (
        p_user_id,
        'CALCULATION',
        v_old_score,
        v_trust_score,
        v_metrics
    );
    
    RETURN jsonb_build_object(
        'trustScore', v_trust_score,
        'trustTier', v_trust_tier,
        'metrics', v_metrics,
        'previousScore', v_old_score
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the triggers
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

-- Function to process queued updates (can be called by edge function or cron job)
CREATE OR REPLACE FUNCTION public.process_trust_score_queue(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(processed INTEGER, failed INTEGER) AS $$
DECLARE
    v_processed INTEGER := 0;
    v_failed INTEGER := 0;
    v_queue_item RECORD;
BEGIN
    FOR v_queue_item IN 
        SELECT * FROM trust_score_update_queue
        WHERE status = 'pending'
        AND attempts < 3
        ORDER BY created_at
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    LOOP
        BEGIN
            -- Calculate trust score
            PERFORM public.calculate_trust_score_immediate(v_queue_item.user_id);
            
            -- Mark as processed
            UPDATE trust_score_update_queue
            SET status = 'completed',
                processed_at = NOW()
            WHERE id = v_queue_item.id;
            
            v_processed := v_processed + 1;
        EXCEPTION
            WHEN OTHERS THEN
                -- Mark as failed and increment attempts
                UPDATE trust_score_update_queue
                SET status = 'failed',
                    attempts = attempts + 1
                WHERE id = v_queue_item.id;
                
                v_failed := v_failed + 1;
        END;
    END LOOP;
    
    RETURN QUERY SELECT v_processed, v_failed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for queue processing
CREATE INDEX IF NOT EXISTS idx_trust_queue_pending 
    ON trust_score_update_queue(created_at) 
    WHERE status = 'pending';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.queue_trust_score_update TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_trust_score_immediate TO service_role;
GRANT EXECUTE ON FUNCTION public.process_trust_score_queue TO service_role;

-- Clean up old queue entries periodically
CREATE OR REPLACE FUNCTION public.cleanup_trust_score_queue()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM trust_score_update_queue
    WHERE processed_at < NOW() - INTERVAL '7 days'
    OR (status = 'failed' AND attempts >= 3 AND created_at < NOW() - INTERVAL '1 day');
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the edge function request body to use recipient_id
CREATE OR REPLACE FUNCTION public.trigger_trust_score_edge_function(p_user_id UUID, p_trigger_type TEXT)
RETURNS VOID AS $$
BEGIN
    -- This function can be called to invoke the edge function
    -- In production, you would use pg_net or a similar extension
    -- For now, we'll just calculate immediately
    PERFORM public.calculate_trust_score_immediate(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log migration completion
INSERT INTO public.schema_migrations (version, applied_at) 
VALUES ('012_enhanced_trust_score_triggers', NOW()) 
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();

-- Add helpful comments
COMMENT ON TABLE public.trust_score_update_queue IS 'Queue for pending trust score calculations';
COMMENT ON FUNCTION public.calculate_trust_score_immediate IS 'Calculates trust score directly in the database without edge function';
COMMENT ON FUNCTION public.process_trust_score_queue IS 'Processes pending trust score calculations from the queue';
