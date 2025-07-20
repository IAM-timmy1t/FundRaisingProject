-- Donor Analytics Functions
-- Provides comprehensive analytics data for donors to track their impact

-- Function to get donor dashboard data
CREATE OR REPLACE FUNCTION get_donor_dashboard_data(p_donor_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_donor_email TEXT;
BEGIN
    -- Get donor email for guest donation matching
    SELECT email INTO v_donor_email FROM auth.users WHERE id = p_donor_id;

    WITH donor_stats AS (
        SELECT 
            COUNT(DISTINCT d.id) as total_donations,
            COALESCE(SUM(d.amount), 0) as total_amount,
            COUNT(DISTINCT d.campaign_id) as campaigns_supported,
            COALESCE(AVG(d.amount), 0) as average_donation,
            MIN(d.created_at) as first_donation_date,
            MAX(d.created_at) as last_donation_date
        FROM donations d
        WHERE (d.donor_id = p_donor_id OR (d.donor_email = v_donor_email AND d.donor_id IS NULL))
            AND d.payment_status = 'completed'
    ),
    supported_campaigns AS (
        SELECT 
            c.id,
            c.title,
            c.need_type,
            c.goal_amount,
            c.raised_amount,
            c.currency,
            c.status,
            c.deadline,
            COALESCE(c.cover_image_url, '') as cover_image_url,
            SUM(d.amount) as donor_contribution,
            COUNT(d.id) as donation_count,
            MAX(d.created_at) as last_donation_date,
            ROUND((c.raised_amount / c.goal_amount * 100)::numeric, 2) as progress_percentage
        FROM campaigns c
        INNER JOIN donations d ON c.id = d.campaign_id
        WHERE (d.donor_id = p_donor_id OR (d.donor_email = v_donor_email AND d.donor_id IS NULL))
            AND d.payment_status = 'completed'
        GROUP BY c.id, c.title, c.need_type, c.goal_amount, c.raised_amount, 
                 c.currency, c.status, c.deadline, c.cover_image_url
        ORDER BY last_donation_date DESC
    ),
    recent_donations AS (
        SELECT 
            d.id,
            d.campaign_id,
            c.title as campaign_title,
            d.amount,
            d.currency,
            d.created_at,
            d.message,
            dr.receipt_number,
            dr.receipt_url
        FROM donations d
        INNER JOIN campaigns c ON d.campaign_id = c.id
        LEFT JOIN donation_receipts dr ON d.id = dr.donation_id
        WHERE (d.donor_id = p_donor_id OR (d.donor_email = v_donor_email AND d.donor_id IS NULL))
            AND d.payment_status = 'completed'
        ORDER BY d.created_at DESC
        LIMIT 10
    ),
    donation_timeline AS (
        SELECT 
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as donation_count,
            SUM(amount) as monthly_amount
        FROM donations
        WHERE (donor_id = p_donor_id OR (donor_email = v_donor_email AND donor_id IS NULL))
            AND payment_status = 'completed'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
        LIMIT 12
    ),
    impact_summary AS (
        SELECT 
            c.need_type,
            COUNT(DISTINCT c.id) as campaign_count,
            SUM(d.amount) as total_contribution
        FROM campaigns c
        INNER JOIN donations d ON c.id = d.campaign_id
        WHERE (d.donor_id = p_donor_id OR (d.donor_email = v_donor_email AND d.donor_id IS NULL))
            AND d.payment_status = 'completed'
        GROUP BY c.need_type
    ),
    recent_updates AS (
        SELECT 
            cu.id,
            cu.campaign_id,
            c.title as campaign_title,
            cu.title as update_title,
            cu.content,
            cu.type,
            cu.created_at,
            CASE 
                WHEN cu.media_urls IS NOT NULL AND jsonb_array_length(cu.media_urls) > 0 
                THEN cu.media_urls->0->>'url'
                ELSE NULL
            END as first_media_url
        FROM campaign_updates cu
        INNER JOIN campaigns c ON cu.campaign_id = c.id
        WHERE cu.campaign_id IN (
            SELECT DISTINCT campaign_id 
            FROM donations 
            WHERE (donor_id = p_donor_id OR (donor_email = v_donor_email AND donor_id IS NULL))
                AND payment_status = 'completed'
        )
        ORDER BY cu.created_at DESC
        LIMIT 5
    )
    SELECT json_build_object(
        'donor_stats', (SELECT row_to_json(ds) FROM donor_stats ds),
        'supported_campaigns', (SELECT json_agg(sc) FROM supported_campaigns sc),
        'recent_donations', (SELECT json_agg(rd) FROM recent_donations rd),
        'donation_timeline', (SELECT json_agg(dt) FROM donation_timeline dt),
        'impact_summary', (SELECT json_agg(is_data) FROM impact_summary is_data),
        'recent_updates', (SELECT json_agg(ru) FROM recent_updates ru)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get donor impact metrics
CREATE OR REPLACE FUNCTION get_donor_impact_metrics(p_donor_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_donor_email TEXT;
BEGIN
    -- Get donor email for guest donation matching
    SELECT email INTO v_donor_email FROM auth.users WHERE id = p_donor_id;

    WITH impact_metrics AS (
        SELECT 
            -- Overall impact
            COUNT(DISTINCT c.id) as campaigns_helped,
            COUNT(DISTINCT c.recipient_id) as recipients_helped,
            COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'FUNDED') as campaigns_fully_funded,
            
            -- Financial impact
            SUM(d.amount) as total_donated,
            SUM(d.amount) FILTER (WHERE c.status = 'FUNDED') as amount_to_funded_campaigns,
            
            -- Trust score impact
            AVG(up.trust_score) FILTER (WHERE up.trust_score IS NOT NULL) as avg_recipient_trust_score,
            
            -- Geographic impact
            COUNT(DISTINCT up.country_iso) as countries_impacted
            
        FROM donations d
        INNER JOIN campaigns c ON d.campaign_id = c.id
        LEFT JOIN user_profiles up ON c.recipient_id = up.id
        WHERE (d.donor_id = p_donor_id OR (d.donor_email = v_donor_email AND d.donor_id IS NULL))
            AND d.payment_status = 'completed'
    ),
    campaign_success_rate AS (
        SELECT 
            COUNT(*) FILTER (WHERE c.status = 'FUNDED') as funded_count,
            COUNT(*) as total_count,
            CASE 
                WHEN COUNT(*) > 0 
                THEN ROUND((COUNT(*) FILTER (WHERE c.status = 'FUNDED')::numeric / COUNT(*) * 100), 2)
                ELSE 0
            END as success_rate
        FROM campaigns c
        WHERE c.id IN (
            SELECT DISTINCT campaign_id 
            FROM donations 
            WHERE (donor_id = p_donor_id OR (donor_email = v_donor_email AND donor_id IS NULL))
                AND payment_status = 'completed'
        )
    ),
    update_engagement AS (
        SELECT 
            COUNT(DISTINCT cu.id) as updates_received,
            COUNT(DISTINCT cu.id) FILTER (WHERE cu.type = 'spend_update') as spend_updates,
            COUNT(DISTINCT cu.id) FILTER (WHERE cu.type = 'impact_story') as impact_stories
        FROM campaign_updates cu
        WHERE cu.campaign_id IN (
            SELECT DISTINCT campaign_id 
            FROM donations 
            WHERE (donor_id = p_donor_id OR (donor_email = v_donor_email AND donor_id IS NULL))
                AND payment_status = 'completed'
        )
    )
    SELECT json_build_object(
        'impact_metrics', (SELECT row_to_json(im) FROM impact_metrics im),
        'campaign_success_rate', (SELECT row_to_json(csr) FROM campaign_success_rate csr),
        'update_engagement', (SELECT row_to_json(ue) FROM update_engagement ue)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_donor_dashboard_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_donor_impact_metrics TO authenticated;
