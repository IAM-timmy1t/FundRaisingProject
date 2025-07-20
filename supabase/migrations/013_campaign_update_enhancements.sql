-- Migration 013: Campaign Update Enhancements
-- Task #17: Campaign Update System
-- Description: Additional fields and functions for enhanced campaign update system

-- Add missing fields to campaign_updates table
ALTER TABLE public.campaign_updates 
ADD COLUMN IF NOT EXISTS spend_amount_tagged DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS content_plaintext TEXT;

-- Update the campaign_updates table to ensure all required fields exist
ALTER TABLE public.campaign_updates 
ALTER COLUMN content_markdown SET NOT NULL,
ALTER COLUMN author_id SET NOT NULL;

-- Create function to extract plaintext from markdown
CREATE OR REPLACE FUNCTION public.markdown_to_plaintext(markdown_text TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Simple markdown stripping (can be enhanced)
    RETURN regexp_replace(
        regexp_replace(
            regexp_replace(
                regexp_replace(markdown_text, E'\\#{1,6}\\s*', '', 'g'), -- Remove headers
                E'\\*{1,3}([^\\*]+)\\*{1,3}', E'\\1', 'g'), -- Remove bold/italic
            E'\\[([^\\]]+)\\]\\([^\\)]+\\)', E'\\1', 'g'), -- Remove links
        E'\\n{3,}', E'\n\n', 'g' -- Normalize line breaks
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to automatically generate plaintext content
CREATE OR REPLACE FUNCTION public.generate_plaintext_content()
RETURNS TRIGGER AS $$
BEGIN
    NEW.content_plaintext := public.markdown_to_plaintext(NEW.content_markdown);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for plaintext generation
DROP TRIGGER IF EXISTS generate_plaintext_on_update ON public.campaign_updates;
CREATE TRIGGER generate_plaintext_on_update
    BEFORE INSERT OR UPDATE OF content_markdown
    ON public.campaign_updates
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_plaintext_content();

-- Function to calculate next update due date
CREATE OR REPLACE FUNCTION public.calculate_next_update_due(
    p_campaign_id UUID
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    v_campaign RECORD;
    v_last_update TIMESTAMP WITH TIME ZONE;
    v_update_frequency INTEGER;
BEGIN
    -- Get campaign details
    SELECT need_type, created_at
    INTO v_campaign
    FROM campaigns
    WHERE id = p_campaign_id;
    
    -- Determine update frequency based on need type
    v_update_frequency := CASE v_campaign.need_type
        WHEN 'EMERGENCY' THEN 7
        WHEN 'MEDICAL' THEN 10
        WHEN 'HEALTH' THEN 10
        ELSE 14
    END;
    
    -- Get last update date
    SELECT MAX(created_at)
    INTO v_last_update
    FROM campaign_updates
    WHERE campaign_id = p_campaign_id;
    
    -- If no updates yet, calculate from campaign creation
    IF v_last_update IS NULL THEN
        v_last_update := v_campaign.created_at;
    END IF;
    
    -- Return next due date
    RETURN v_last_update + (v_update_frequency || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count overdue updates
CREATE OR REPLACE FUNCTION public.count_overdue_updates(
    p_campaign_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_campaign RECORD;
    v_expected_updates INTEGER;
    v_actual_updates INTEGER;
    v_days_since_creation INTEGER;
    v_update_frequency INTEGER;
BEGIN
    -- Get campaign details
    SELECT need_type, created_at, status
    INTO v_campaign
    FROM campaigns
    WHERE id = p_campaign_id;
    
    -- Only count for active campaigns
    IF v_campaign.status NOT IN ('FUNDING', 'FUNDED') THEN
        RETURN 0;
    END IF;
    
    -- Determine update frequency
    v_update_frequency := CASE v_campaign.need_type
        WHEN 'EMERGENCY' THEN 7
        WHEN 'MEDICAL' THEN 10
        WHEN 'HEALTH' THEN 10
        ELSE 14
    END;
    
    -- Calculate days since creation
    v_days_since_creation := EXTRACT(DAY FROM NOW() - v_campaign.created_at);
    
    -- Calculate expected updates
    v_expected_updates := GREATEST(1, v_days_since_creation / v_update_frequency);
    
    -- Get actual update count
    SELECT COUNT(*)
    INTO v_actual_updates
    FROM campaign_updates
    WHERE campaign_id = p_campaign_id;
    
    -- Return overdue count
    RETURN GREATEST(0, v_expected_updates - v_actual_updates);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update campaigns to recalculate next update due and overdue count
UPDATE campaigns
SET 
    next_update_due = public.calculate_next_update_due(id),
    overdue_updates_count = public.count_overdue_updates(id)
WHERE status IN ('FUNDING', 'FUNDED');

-- Trigger to update campaign stats after new update
CREATE OR REPLACE FUNCTION public.update_campaign_after_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Update campaign stats
    UPDATE campaigns
    SET 
        last_update_at = NEW.created_at,
        update_count = update_count + 1,
        next_update_due = public.calculate_next_update_due(NEW.campaign_id),
        overdue_updates_count = public.count_overdue_updates(NEW.campaign_id),
        updated_at = NOW()
    WHERE id = NEW.campaign_id;
    
    -- Update withdrawn amount if spending was recorded
    IF NEW.spend_amount_tagged > 0 THEN
        UPDATE campaigns
        SET withdrawn_amount = COALESCE(withdrawn_amount, 0) + NEW.spend_amount_tagged
        WHERE id = NEW.campaign_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for campaign update stats
DROP TRIGGER IF EXISTS update_campaign_stats_on_update ON public.campaign_updates;
CREATE TRIGGER update_campaign_stats_on_update
    AFTER INSERT ON public.campaign_updates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_campaign_after_update();

-- Function to validate update spending
CREATE OR REPLACE FUNCTION public.validate_update_spending()
RETURNS TRIGGER AS $$
DECLARE
    v_available_funds DECIMAL;
BEGIN
    -- Get available funds
    SELECT raised_amount - COALESCE(withdrawn_amount, 0)
    INTO v_available_funds
    FROM campaigns
    WHERE id = NEW.campaign_id;
    
    -- Check if spending exceeds available funds
    IF NEW.spend_amount_tagged > v_available_funds THEN
        RAISE EXCEPTION 'Spending amount exceeds available funds';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for spending validation
DROP TRIGGER IF EXISTS validate_spending_on_update ON public.campaign_updates;
CREATE TRIGGER validate_spending_on_update
    BEFORE INSERT OR UPDATE OF spend_amount_tagged
    ON public.campaign_updates
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_update_spending();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_updates_scheduled 
    ON public.campaign_updates(scheduled_for) 
    WHERE scheduled_for IS NOT NULL AND scheduled_for > NOW();

CREATE INDEX IF NOT EXISTS idx_campaign_updates_spending 
    ON public.campaign_updates(campaign_id, spend_amount_tagged) 
    WHERE spend_amount_tagged > 0;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.markdown_to_plaintext TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_next_update_due TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_overdue_updates TO authenticated;

-- Update edge function body in the database
UPDATE public.functions
SET body = regexp_replace(body, 'amount_spent', 'spend_amount_tagged', 'g')
WHERE name = 'create-campaign-update';

-- Log migration completion
INSERT INTO public.schema_migrations (version, applied_at) 
VALUES ('013_campaign_update_enhancements', NOW()) 
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();

-- Add helpful comments
COMMENT ON COLUMN public.campaign_updates.spend_amount_tagged IS 'Amount spent as recorded in this update';
COMMENT ON COLUMN public.campaign_updates.payment_reference IS 'Reference number or receipt identifier for spending';
COMMENT ON COLUMN public.campaign_updates.content_plaintext IS 'Auto-generated plaintext version of markdown content';
COMMENT ON FUNCTION public.calculate_next_update_due IS 'Calculates when the next update is due based on campaign type';
COMMENT ON FUNCTION public.count_overdue_updates IS 'Counts how many updates are overdue for a campaign';
