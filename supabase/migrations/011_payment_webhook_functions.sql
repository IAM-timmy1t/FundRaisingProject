-- Migration 011: Payment Webhook Support Functions
-- Task #13: Payment Webhook Handler Support
-- Description: Functions to support Stripe webhook processing

-- Function to safely decrement campaign raised amount (for refunds)
CREATE OR REPLACE FUNCTION public.decrement_campaign_raised_amount(
    campaign_id UUID,
    amount DECIMAL(10, 2)
)
RETURNS VOID AS $$
BEGIN
    UPDATE campaigns
    SET 
        raised_amount = GREATEST(0, raised_amount - amount),
        -- If campaign was funded but now below goal, update status
        status = CASE 
            WHEN raised_amount - amount < goal_amount AND status = 'FUNDED' THEN 'FUNDING'
            ELSE status
        END,
        funded_at = CASE 
            WHEN raised_amount - amount < goal_amount AND status = 'FUNDED' THEN NULL
            ELSE funded_at
        END,
        updated_at = NOW()
    WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle successful payment
CREATE OR REPLACE FUNCTION public.process_successful_payment(
    donation_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_donation RECORD;
    v_campaign RECORD;
    v_is_new_donor BOOLEAN;
    v_result JSONB := '{}';
BEGIN
    -- Get donation details with campaign
    SELECT d.*, c.recipient_id, c.title as campaign_title, c.goal_amount
    INTO v_donation
    FROM donations d
    JOIN campaigns c ON d.campaign_id = c.id
    WHERE d.id = donation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Donation not found: %', donation_id;
    END IF;
    
    -- Check if this is a new donor for the campaign
    SELECT COUNT(*) = 0 INTO v_is_new_donor
    FROM donations
    WHERE campaign_id = v_donation.campaign_id
    AND donor_id = v_donation.donor_id
    AND payment_status = 'completed'
    AND id != donation_id;
    
    -- Update donation status
    UPDATE donations
    SET payment_status = 'completed',
        processed_at = NOW()
    WHERE id = donation_id;
    
    -- Update campaign statistics
    UPDATE campaigns
    SET raised_amount = raised_amount + v_donation.amount,
        donor_count = CASE WHEN v_is_new_donor THEN donor_count + 1 ELSE donor_count END,
        funded_at = CASE 
            WHEN raised_amount + v_donation.amount >= goal_amount AND funded_at IS NULL 
            THEN NOW() 
            ELSE funded_at 
        END,
        status = CASE 
            WHEN raised_amount + v_donation.amount >= goal_amount AND status = 'FUNDING' 
            THEN 'FUNDED' 
            ELSE status 
        END,
        updated_at = NOW()
    WHERE id = v_donation.campaign_id
    RETURNING * INTO v_campaign;
    
    -- Update donor profile if not anonymous
    IF v_donation.donor_id IS NOT NULL AND NOT v_donation.is_anonymous THEN
        UPDATE user_profiles
        SET total_donated = total_donated + v_donation.amount,
            campaigns_supported = CASE 
                WHEN v_is_new_donor THEN campaigns_supported + 1 
                ELSE campaigns_supported 
            END,
            updated_at = NOW()
        WHERE id = v_donation.donor_id;
    END IF;
    
    -- Create notification for campaign owner
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
    ) VALUES (
        v_donation.recipient_id,
        'donation_received',
        'New Donation Received!',
        CASE 
            WHEN v_donation.is_anonymous THEN 
                format('An anonymous donor contributed %s to your campaign "%s"', 
                    format_currency(v_donation.amount, v_donation.currency), 
                    v_donation.campaign_title)
            ELSE 
                format('%s contributed %s to your campaign "%s"', 
                    COALESCE(v_donation.donor_name, 'A supporter'),
                    format_currency(v_donation.amount, v_donation.currency), 
                    v_donation.campaign_title)
        END,
        jsonb_build_object(
            'donation_id', v_donation.id,
            'campaign_id', v_donation.campaign_id,
            'amount', v_donation.amount,
            'currency', v_donation.currency
        )
    );
    
    -- Log trust score event for timely processing
    INSERT INTO trust_score_events (
        user_id,
        event_type,
        event_data,
        impact_score
    ) VALUES (
        v_donation.recipient_id,
        'donation_received',
        jsonb_build_object(
            'donation_id', v_donation.id,
            'amount', v_donation.amount,
            'is_new_donor', v_is_new_donor
        ),
        CASE WHEN v_is_new_donor THEN 2 ELSE 1 END
    );
    
    -- Return result
    v_result := jsonb_build_object(
        'success', true,
        'donation_id', v_donation.id,
        'campaign_id', v_donation.campaign_id,
        'is_new_donor', v_is_new_donor,
        'campaign_funded', v_campaign.raised_amount >= v_campaign.goal_amount
    );
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to format currency (helper for notifications)
CREATE OR REPLACE FUNCTION public.format_currency(
    amount DECIMAL,
    currency VARCHAR DEFAULT 'USD'
)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE currency
        WHEN 'USD' THEN '$' || TO_CHAR(amount, 'FM999,999.00')
        WHEN 'EUR' THEN '€' || TO_CHAR(amount, 'FM999,999.00')
        WHEN 'GBP' THEN '£' || TO_CHAR(amount, 'FM999,999.00')
        ELSE currency || ' ' || TO_CHAR(amount, 'FM999,999.00')
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate webhook signature (for additional security)
CREATE OR REPLACE FUNCTION public.validate_stripe_webhook(
    payload TEXT,
    signature TEXT,
    secret TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    computed_signature TEXT;
BEGIN
    -- This is a placeholder - actual implementation would compute HMAC-SHA256
    -- In production, this should be implemented in the edge function
    -- as PostgreSQL doesn't have built-in HMAC functions
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.decrement_campaign_raised_amount TO service_role;
GRANT EXECUTE ON FUNCTION public.process_successful_payment TO service_role;
GRANT EXECUTE ON FUNCTION public.format_currency TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_stripe_webhook TO service_role;

-- Add indexes for webhook processing performance
CREATE INDEX IF NOT EXISTS idx_donations_payment_intent_id 
    ON donations(payment_intent_id) 
    WHERE payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_donations_payment_status 
    ON donations(payment_status, created_at);

-- Add composite index for donor lookup
CREATE INDEX IF NOT EXISTS idx_donations_donor_campaign 
    ON donations(campaign_id, donor_id, payment_status)
    WHERE donor_id IS NOT NULL;

-- Log migration completion
INSERT INTO public.schema_migrations (version, applied_at) 
VALUES ('011_payment_webhook_functions', NOW()) 
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();

-- Add helpful comments
COMMENT ON FUNCTION public.decrement_campaign_raised_amount IS 'Safely decrements campaign raised amount for refunds';
COMMENT ON FUNCTION public.process_successful_payment IS 'Handles all updates when a payment succeeds';
COMMENT ON FUNCTION public.format_currency IS 'Formats currency amounts for display in notifications';
