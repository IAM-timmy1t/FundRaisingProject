-- Migration: Add Stripe payment support functions
-- Description: Helper functions for Stripe payment integration

-- Function to safely decrement campaign raised amount (for refunds)
CREATE OR REPLACE FUNCTION public.decrement_campaign_raised_amount(
    campaign_id UUID,
    amount DECIMAL(12,2)
)
RETURNS void AS $$
BEGIN
    UPDATE public.campaigns
    SET 
        raised_amount = GREATEST(0, raised_amount - amount),
        -- If campaign was funded and refund brings it below goal, update status
        status = CASE 
            WHEN status = 'FUNDED' AND (raised_amount - amount) < goal_amount THEN 'FUNDING'
            ELSE status
        END,
        funded_at = CASE
            WHEN status = 'FUNDED' AND (raised_amount - amount) < goal_amount THEN NULL
            ELSE funded_at
        END
    WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get donation statistics for a user
CREATE OR REPLACE FUNCTION public.get_user_donation_stats(user_id UUID)
RETURNS TABLE (
    total_donated DECIMAL(12,2),
    total_campaigns_supported INTEGER,
    recent_donations JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(d.amount), 0) as total_donated,
        COUNT(DISTINCT d.campaign_id)::INTEGER as total_campaigns_supported,
        COALESCE(
            json_agg(
                json_build_object(
                    'id', d.id,
                    'amount', d.amount,
                    'currency', d.currency,
                    'campaign_title', c.title,
                    'campaign_id', c.id,
                    'created_at', d.created_at
                ) ORDER BY d.created_at DESC
            ) FILTER (WHERE d.id IS NOT NULL), 
            '[]'::json
        ) as recent_donations
    FROM public.donations d
    LEFT JOIN public.campaigns c ON d.campaign_id = c.id
    WHERE d.donor_id = get_user_donation_stats.user_id
    AND d.payment_status = 'completed'
    AND d.created_at > NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for payment intent lookups
CREATE INDEX IF NOT EXISTS idx_donations_payment_intent 
ON public.donations(payment_intent_id) 
WHERE payment_intent_id IS NOT NULL;

-- Add index for donor statistics
CREATE INDEX IF NOT EXISTS idx_donations_donor_completed 
ON public.donations(donor_id, payment_status) 
WHERE payment_status = 'completed';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.decrement_campaign_raised_amount TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_donation_stats TO authenticated, service_role;
