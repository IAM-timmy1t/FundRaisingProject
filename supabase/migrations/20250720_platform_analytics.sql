-- Platform Analytics Functions
-- Migration: 20250720_platform_analytics.sql

-- Function to get platform overview metrics
CREATE OR REPLACE FUNCTION get_platform_overview_metrics(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
  v_start DATE := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  v_end DATE := COALESCE(p_end_date, CURRENT_DATE);
  v_prev_start DATE := v_start - (v_end - v_start);
  v_prev_end DATE := v_start - INTERVAL '1 day';
BEGIN
  WITH current_period AS (
    SELECT
      COUNT(DISTINCT c.id) AS total_campaigns,
      COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) AS active_campaigns,
      COUNT(DISTINCT d.id) AS total_donations,
      COALESCE(SUM(d.amount), 0) AS total_raised,
      COUNT(DISTINCT u.id) AS total_users,
      COUNT(DISTINCT CASE 
        WHEN d.created_at >= v_start THEN d.donor_id 
        WHEN cu.created_at >= v_start THEN cu.user_id 
      END) AS active_users,
      AVG(d.amount) AS avg_donation
    FROM user_profiles u
    LEFT JOIN campaigns c ON c.recipient_id = u.id
    LEFT JOIN donations d ON d.campaign_id = c.id
    LEFT JOIN campaign_updates cu ON cu.campaign_id = c.id
    WHERE u.created_at <= v_end
  ),
  previous_period AS (
    SELECT
      COUNT(DISTINCT c.id) AS prev_campaigns
    FROM campaigns c
    WHERE c.created_at BETWEEN v_prev_start AND v_prev_end
  )
  SELECT json_build_object(
    'total_campaigns', cp.total_campaigns,
    'active_campaigns', cp.active_campaigns,
    'total_donations', cp.total_donations,
    'total_raised', cp.total_raised,
    'total_users', cp.total_users,
    'active_users', cp.active_users,
    'avg_donation', cp.avg_donation,
    'platform_growth', CASE 
      WHEN pp.prev_campaigns > 0 
      THEN ((cp.total_campaigns - pp.prev_campaigns)::NUMERIC / pp.prev_campaigns * 100)
      ELSE 0 
    END
  ) INTO v_result
  FROM current_period cp, previous_period pp;
  
  RETURN v_result;
END;
$$;

-- Function to get donor behavior analytics
CREATE OR REPLACE FUNCTION get_donor_behavior_analytics(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
  v_start DATE := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  v_end DATE := COALESCE(p_end_date, CURRENT_DATE);
BEGIN
  WITH donor_stats AS (
    SELECT
      d.donor_id,
      COUNT(*) AS donation_count,
      SUM(d.amount) AS total_donated,
      MIN(d.created_at) AS first_donation,
      MAX(d.created_at) AS last_donation
    FROM donations d
    WHERE d.created_at BETWEEN v_start AND v_end
    GROUP BY d.donor_id
  ),
  donation_frequency AS (
    SELECT
      CASE 
        WHEN donation_count = 1 THEN 'One-time'
        WHEN donation_count BETWEEN 2 AND 3 THEN '2-3 times'
        WHEN donation_count BETWEEN 4 AND 5 THEN '4-5 times'
        ELSE '6+ times'
      END AS frequency,
      COUNT(*) AS donor_count
    FROM donor_stats
    GROUP BY frequency
  ),
  amount_distribution AS (
    SELECT
      CASE 
        WHEN amount < 25 THEN 'Under £25'
        WHEN amount BETWEEN 25 AND 50 THEN '£25-50'
        WHEN amount BETWEEN 51 AND 100 THEN '£51-100'
        WHEN amount BETWEEN 101 AND 250 THEN '£101-250'
        ELSE 'Over £250'
      END AS amount_range,
      COUNT(*) AS donation_count
    FROM donations
    WHERE created_at BETWEEN v_start AND v_end
    GROUP BY amount_range
  ),
  repeat_donors AS (
    SELECT 
      COUNT(DISTINCT CASE WHEN donation_count > 1 THEN donor_id END) AS repeat_donors,
      COUNT(DISTINCT donor_id) AS total_donors
    FROM donor_stats
  ),
  donation_times AS (
    SELECT
      EXTRACT(HOUR FROM created_at) AS hour,
      COUNT(*) AS donations
    FROM donations
    WHERE created_at BETWEEN v_start AND v_end
    GROUP BY hour
    ORDER BY donations DESC
    LIMIT 10
  )
  SELECT json_build_object(
    'donation_frequency', (SELECT json_agg(df) FROM donation_frequency df),
    'donation_amount_distribution', (SELECT json_agg(ad) FROM amount_distribution ad),
    'repeat_donor_rate', CASE 
      WHEN rd.total_donors > 0 
      THEN (rd.repeat_donors::NUMERIC / rd.total_donors * 100)
      ELSE 0 
    END,
    'avg_donations_per_donor', (
      SELECT AVG(donation_count) FROM donor_stats
    ),
    'top_donation_times', (SELECT json_agg(dt) FROM donation_times dt)
  ) INTO v_result
  FROM repeat_donors rd;
  
  RETURN v_result;
END;
$$;

-- Function to get platform performance metrics
CREATE OR REPLACE FUNCTION get_platform_performance_metrics(
  p_days_back INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH daily_metrics AS (
    SELECT
      DATE(created_at) AS date,
      COUNT(DISTINCT CASE WHEN type = 'campaign' THEN id END) AS new_campaigns,
      COUNT(DISTINCT CASE WHEN type = 'donation' THEN id END) AS donations,
      SUM(CASE WHEN type = 'donation' THEN amount ELSE 0 END) AS revenue,
      COUNT(DISTINCT user_id) AS active_users
    FROM (
      SELECT id, created_at, recipient_id AS user_id, 'campaign' AS type, 0 AS amount
      FROM campaigns
      UNION ALL
      SELECT id, created_at, donor_id AS user_id, 'donation' AS type, amount
      FROM donations
    ) activity
    WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
    GROUP BY DATE(created_at)
    ORDER BY date
  ),
  conversion_stats AS (
    SELECT
      COUNT(DISTINCT session_id) AS total_sessions,
      COUNT(DISTINCT CASE WHEN event_type = 'donation_completed' THEN session_id END) AS converted_sessions
    FROM campaign_analytics_events
    WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 day' * p_days_back
  )
  SELECT json_build_object(
    'daily_metrics', (SELECT json_agg(dm) FROM daily_metrics dm),
    'overall_conversion_rate', CASE 
      WHEN cs.total_sessions > 0 
      THEN (cs.converted_sessions::NUMERIC / cs.total_sessions * 100)
      ELSE 0 
    END
  ) INTO v_result
  FROM conversion_stats cs;
  
  RETURN v_result;
END;
$$;

-- Function to get campaign category analytics
CREATE OR REPLACE FUNCTION get_campaign_category_analytics()
RETURNS TABLE(
  need_type TEXT,
  campaign_count BIGINT,
  total_raised NUMERIC,
  avg_goal NUMERIC,
  success_rate NUMERIC,
  avg_donation NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.need_type,
    COUNT(DISTINCT c.id) AS campaign_count,
    COALESCE(SUM(d.amount), 0) AS total_raised,
    AVG(c.goal_amount) AS avg_goal,
    COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.id END)::NUMERIC / 
      NULLIF(COUNT(DISTINCT c.id), 0) * 100 AS success_rate,
    AVG(d.amount) AS avg_donation
  FROM campaigns c
  LEFT JOIN donations d ON d.campaign_id = c.id
  GROUP BY c.need_type
  ORDER BY campaign_count DESC;
END;
$$;

-- Function to get geographic distribution
CREATE OR REPLACE FUNCTION get_geographic_distribution()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH donor_countries AS (
    SELECT
      COALESCE(u.country_iso, 'Unknown') AS country,
      COUNT(DISTINCT d.donor_id) AS donors,
      SUM(d.amount) AS total_amount
    FROM donations d
    JOIN user_profiles u ON u.id = d.donor_id
    GROUP BY u.country_iso
    ORDER BY total_amount DESC
    LIMIT 20
  ),
  recipient_countries AS (
    SELECT
      COALESCE(u.country_iso, 'Unknown') AS country,
      COUNT(DISTINCT c.recipient_id) AS recipients,
      COUNT(DISTINCT c.id) AS campaigns
    FROM campaigns c
    JOIN user_profiles u ON u.id = c.recipient_id
    GROUP BY u.country_iso
    ORDER BY campaigns DESC
    LIMIT 20
  )
  SELECT json_build_object(
    'donor_countries', (SELECT json_agg(dc) FROM donor_countries dc),
    'recipient_countries', (SELECT json_agg(rc) FROM recipient_countries rc)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Function to get platform revenue analytics
CREATE OR REPLACE FUNCTION get_platform_revenue_analytics(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
  v_start DATE := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '365 days');
  v_end DATE := COALESCE(p_end_date, CURRENT_DATE);
BEGIN
  WITH monthly_revenue AS (
    SELECT
      DATE_TRUNC('month', d.created_at) AS month,
      SUM(d.amount) AS gross_revenue,
      SUM(d.platform_fee) AS platform_fees,
      SUM(d.processor_fee) AS processor_fees,
      SUM(d.amount - d.platform_fee - d.processor_fee) AS net_revenue,
      COUNT(*) AS transaction_count
    FROM donations d
    WHERE d.created_at BETWEEN v_start AND v_end
    GROUP BY DATE_TRUNC('month', d.created_at)
    ORDER BY month
  ),
  totals AS (
    SELECT
      SUM(gross_revenue) AS total_revenue,
      SUM(platform_fees + processor_fees) AS total_fees,
      AVG(platform_fees + processor_fees) AS avg_transaction_fee
    FROM monthly_revenue
  )
  SELECT json_build_object(
    'monthly_revenue', (SELECT json_agg(mr) FROM monthly_revenue mr),
    'total_revenue', t.total_revenue,
    'total_fees', t.total_fees,
    'avg_transaction_fee', t.avg_transaction_fee,
    'revenue_growth', (
      SELECT CASE 
        WHEN COUNT(*) >= 2 
        THEN ((MAX(gross_revenue) - MIN(gross_revenue))::NUMERIC / NULLIF(MIN(gross_revenue), 0) * 100)
        ELSE 0 
      END
      FROM monthly_revenue
    )
  ) INTO v_result
  FROM totals t;
  
  RETURN v_result;
END;
$$;

-- Function to get user growth analytics
CREATE OR REPLACE FUNCTION get_user_growth_analytics(
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  date DATE,
  new_users BIGINT,
  cumulative_users BIGINT,
  active_donors BIGINT,
  active_recipients BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH daily_users AS (
    SELECT
      DATE(created_at) AS date,
      COUNT(*) AS new_users
    FROM user_profiles
    WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
    GROUP BY DATE(created_at)
  ),
  cumulative AS (
    SELECT
      date,
      new_users,
      SUM(new_users) OVER (ORDER BY date) AS cumulative_users
    FROM daily_users
  ),
  active_users AS (
    SELECT
      DATE(activity_date) AS date,
      COUNT(DISTINCT CASE WHEN user_type = 'donor' THEN user_id END) AS active_donors,
      COUNT(DISTINCT CASE WHEN user_type = 'recipient' THEN user_id END) AS active_recipients
    FROM (
      SELECT created_at AS activity_date, donor_id AS user_id, 'donor' AS user_type
      FROM donations
      UNION ALL
      SELECT created_at AS activity_date, recipient_id AS user_id, 'recipient' AS user_type
      FROM campaigns
      UNION ALL
      SELECT created_at AS activity_date, user_id, 'recipient' AS user_type
      FROM campaign_updates
    ) activity
    WHERE activity_date >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
    GROUP BY DATE(activity_date)
  )
  SELECT
    c.date,
    c.new_users,
    c.cumulative_users,
    COALESCE(au.active_donors, 0) AS active_donors,
    COALESCE(au.active_recipients, 0) AS active_recipients
  FROM cumulative c
  LEFT JOIN active_users au ON au.date = c.date
  ORDER BY c.date;
END;
$$;

-- Function to get campaign success metrics
CREATE OR REPLACE FUNCTION get_campaign_success_metrics()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH campaign_stats AS (
    SELECT
      c.id,
      c.need_type,
      c.goal_amount,
      COALESCE(SUM(d.amount), 0) AS total_raised,
      c.status,
      c.created_at,
      c.deadline,
      CASE 
        WHEN c.status = 'completed' THEN c.updated_at - c.created_at
        ELSE NULL
      END AS time_to_goal
    FROM campaigns c
    LEFT JOIN donations d ON d.campaign_id = c.id
    GROUP BY c.id
  ),
  success_by_category AS (
    SELECT
      need_type,
      COUNT(CASE WHEN status = 'completed' THEN 1 END)::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100 AS success_rate
    FROM campaign_stats
    GROUP BY need_type
  )
  SELECT json_build_object(
    'overall_success_rate', (
      SELECT COUNT(CASE WHEN status = 'completed' THEN 1 END)::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100
      FROM campaign_stats
    ),
    'avg_time_to_goal', (
      SELECT EXTRACT(DAY FROM AVG(time_to_goal))
      FROM campaign_stats
      WHERE time_to_goal IS NOT NULL
    ),
    'avg_completion_percentage', (
      SELECT AVG(total_raised / NULLIF(goal_amount, 0) * 100)
      FROM campaign_stats
    ),
    'success_by_category', (SELECT json_agg(sbc) FROM success_by_category sbc)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Function to get trust score distribution
CREATE OR REPLACE FUNCTION get_trust_score_distribution()
RETURNS TABLE(
  trust_tier TEXT,
  user_count BIGINT,
  percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH tier_counts AS (
    SELECT
      trust_tier,
      COUNT(*) AS user_count
    FROM user_profiles
    WHERE trust_tier IS NOT NULL
    GROUP BY trust_tier
  ),
  total AS (
    SELECT SUM(user_count) AS total_users FROM tier_counts
  )
  SELECT
    tc.trust_tier,
    tc.user_count,
    CASE 
      WHEN t.total_users > 0 
      THEN (tc.user_count::NUMERIC / t.total_users * 100)
      ELSE 0 
    END AS percentage
  FROM tier_counts tc, total t
  ORDER BY 
    CASE tc.trust_tier
      WHEN 'platinum' THEN 1
      WHEN 'gold' THEN 2
      WHEN 'silver' THEN 3
      WHEN 'bronze' THEN 4
      ELSE 5
    END;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_need_type ON campaigns(need_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_country ON user_profiles(country_iso);
CREATE INDEX IF NOT EXISTS idx_user_profiles_trust_tier ON user_profiles(trust_tier);

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_platform_overview_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_donor_behavior_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_performance_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign_category_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_geographic_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_revenue_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_growth_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign_success_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_trust_score_distribution TO authenticated;
