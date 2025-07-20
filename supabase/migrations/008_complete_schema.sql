-- Migration 008: Complete Schema Enhancement for Blessed-Horizon
-- Description: Adds missing fields, constraints, and features to complete the database schema
-- Task #3: Database Schema Implementation - Final completion

-- Add missing fields to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS state_province VARCHAR(100),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trust_score_last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS successful_campaigns INTEGER DEFAULT 0 CHECK (successful_campaigns >= 0),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS interests JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS profile_visibility VARCHAR(20) DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'donors_only')),
ADD COLUMN IF NOT EXISTS show_donation_history BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS allow_messages BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add missing fields to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS subtitle VARCHAR(150),
ADD COLUMN IF NOT EXISTS urgency VARCHAR(20) DEFAULT 'MEDIUM' CHECK (urgency IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS withdrawn_amount DECIMAL(12,2) DEFAULT 0 CHECK (withdrawn_amount >= 0),
ADD COLUMN IF NOT EXISTS escrow_amount DECIMAL(12,2) DEFAULT 0 CHECK (escrow_amount >= 0),
ADD COLUMN IF NOT EXISTS funding_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS prayer_request TEXT,
ADD COLUMN IF NOT EXISTS expected_outcomes JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS beneficiaries JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS featured_image_url TEXT,
ADD COLUMN IF NOT EXISTS document_urls JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS favorite_count INTEGER DEFAULT 0 CHECK (favorite_count >= 0),
ADD COLUMN IF NOT EXISTS state_province VARCHAR(100),
ADD COLUMN IF NOT EXISTS location_description TEXT,
ADD COLUMN IF NOT EXISTS coordinates POINT,
ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
ADD COLUMN IF NOT EXISTS flagged_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_update_due TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS update_frequency_days INTEGER DEFAULT 14,
ADD COLUMN IF NOT EXISTS overdue_updates_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_donation DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS repeat_donor_rate DECIMAL(5,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS search_vector tsvector,
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trending_score DECIMAL(10,2) DEFAULT 0;

-- Add missing fields to campaign_updates table
ALTER TABLE public.campaign_updates 
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS amount_spent DECIMAL(12,2) DEFAULT 0 CHECK (amount_spent >= 0),
ADD COLUMN IF NOT EXISTS spending_breakdown JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS remaining_funds DECIMAL(12,2) DEFAULT 0 CHECK (remaining_funds >= 0),
ADD COLUMN IF NOT EXISTS receipt_urls JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS document_urls JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS milestone_percentage INTEGER CHECK (milestone_percentage >= 0 AND milestone_percentage <= 100),
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE;

-- Add missing fields to donations table (if not already added in migration 007)
ALTER TABLE public.donations 
ADD COLUMN IF NOT EXISTS frequency VARCHAR(20) DEFAULT 'ONE_TIME' CHECK (frequency IN ('ONE_TIME', 'WEEKLY', 'MONTHLY', 'QUARTERLY')),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS prayer_request TEXT,
ADD COLUMN IF NOT EXISTS show_amount BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS gift_aid_eligible BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gift_aid_claimed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tax_relief_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_processing_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS escrow_released BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS release_trigger VARCHAR(50),
ADD COLUMN IF NOT EXISTS refunded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_reason TEXT,
ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS recurring_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS referrer_url TEXT,
ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100),
ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100),
ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100),
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- Add missing fields to trust_score_events table
ALTER TABLE public.trust_score_events 
ADD COLUMN IF NOT EXISTS event_description TEXT,
ADD COLUMN IF NOT EXISTS score_change DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS previous_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS donation_id UUID REFERENCES public.donations(id),
ADD COLUMN IF NOT EXISTS update_id UUID REFERENCES public.campaign_updates(id),
ADD COLUMN IF NOT EXISTS weight DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS automated BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Add missing fields to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS action_url TEXT,
ADD COLUMN IF NOT EXISTS action_text VARCHAR(50),
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id),
ADD COLUMN IF NOT EXISTS donation_id UUID REFERENCES public.donations(id),
ADD COLUMN IF NOT EXISTS update_id UUID REFERENCES public.campaign_updates(id),
ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS push_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sms_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sms_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create missing tables

-- User Favorites Table
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, campaign_id)
);

-- Campaign Comments Table
CREATE TABLE IF NOT EXISTS public.campaign_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id UUID REFERENCES public.campaign_comments(id),
    content TEXT NOT NULL,
    is_prayer BOOLEAN DEFAULT FALSE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    flagged BOOLEAN DEFAULT FALSE,
    moderation_status VARCHAR(20) DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schema Migrations Table (for tracking migrations)
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing constraints
ALTER TABLE public.campaigns 
ADD CONSTRAINT IF NOT EXISTS valid_deadline CHECK (deadline IS NULL OR deadline > created_at),
ADD CONSTRAINT IF NOT EXISTS valid_amounts CHECK (raised_amount <= goal_amount * 1.5),
ADD CONSTRAINT IF NOT EXISTS valid_withdrawn CHECK (withdrawn_amount <= raised_amount);

ALTER TABLE public.trust_score_events
ADD CONSTRAINT IF NOT EXISTS valid_score_range CHECK (
    (previous_score IS NULL OR (previous_score >= 0 AND previous_score <= 100)) AND 
    (new_score >= 0 AND new_score <= 100)
);

-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_trust_score ON public.user_profiles(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_verification ON public.user_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active ON public.user_profiles(last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaigns_urgency ON public.campaigns(urgency);
CREATE INDEX IF NOT EXISTS idx_campaigns_trending ON public.campaigns(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_search ON public.campaigns USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_campaigns_location_point ON public.campaigns USING gist(coordinates);

CREATE INDEX IF NOT EXISTS idx_campaign_updates_milestone ON public.campaign_updates(is_milestone) WHERE is_milestone = TRUE;
CREATE INDEX IF NOT EXISTS idx_campaign_updates_scheduled ON public.campaign_updates(scheduled_for) WHERE scheduled_for IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_donations_recurring ON public.donations(subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_donations_payment_method ON public.donations(payment_method);

CREATE INDEX IF NOT EXISTS idx_trust_score_events_expires ON public.trust_score_events(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON public.notifications(scheduled_for) WHERE scheduled_for > NOW();
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_campaign ON public.user_favorites(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_comments_campaign ON public.campaign_comments(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_comments_parent ON public.campaign_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- Create helper functions

-- Function to update campaign search vector
CREATE OR REPLACE FUNCTION public.update_campaign_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.subtitle, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.story_markdown, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.location_description, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for search vector
CREATE TRIGGER update_campaign_search_vector_trigger
    BEFORE INSERT OR UPDATE OF title, subtitle, story_markdown, location_description
    ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_campaign_search_vector();

-- Function to calculate trending score
CREATE OR REPLACE FUNCTION public.calculate_trending_score(campaign_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    score DECIMAL;
    recent_donations INTEGER;
    recent_views INTEGER;
    recent_shares INTEGER;
    age_hours INTEGER;
BEGIN
    SELECT 
        COUNT(DISTINCT d.id) INTO recent_donations
    FROM public.donations d
    WHERE d.campaign_id = calculate_trending_score.campaign_id
    AND d.created_at > NOW() - INTERVAL '24 hours'
    AND d.payment_status = 'completed';
    
    SELECT 
        view_count, share_count,
        EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 INTO recent_views, recent_shares, age_hours
    FROM public.campaigns
    WHERE id = calculate_trending_score.campaign_id;
    
    -- Trending score algorithm (can be adjusted)
    score := (recent_donations * 10 + recent_views * 0.1 + recent_shares * 5) / GREATEST(SQRT(age_hours), 1);
    
    RETURN ROUND(score, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to update user last active timestamp
CREATE OR REPLACE FUNCTION public.update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_profiles
    SET last_active_at = NOW()
    WHERE id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for last active updates
CREATE TRIGGER update_last_active_on_donation
    AFTER INSERT ON public.donations
    FOR EACH ROW
    WHEN (NEW.donor_id IS NOT NULL)
    EXECUTE FUNCTION public.update_user_last_active();

CREATE TRIGGER update_last_active_on_campaign
    AFTER INSERT OR UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_last_active();

CREATE TRIGGER update_last_active_on_comment
    AFTER INSERT ON public.campaign_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_last_active();

-- Function to schedule next update reminder
CREATE OR REPLACE FUNCTION public.schedule_next_update(campaign_id UUID)
RETURNS void AS $$
DECLARE
    v_campaign RECORD;
    next_due TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT * INTO v_campaign
    FROM public.campaigns
    WHERE id = schedule_next_update.campaign_id;
    
    IF v_campaign.status = 'FUNDING' OR v_campaign.status = 'FUNDED' THEN
        next_due := NOW() + (v_campaign.update_frequency_days || ' days')::INTERVAL;
        
        UPDATE public.campaigns
        SET next_update_due = next_due
        WHERE id = schedule_next_update.campaign_id;
        
        -- Create notification for update reminder
        INSERT INTO public.notifications (
            user_id, type, title, message, campaign_id, scheduled_for, priority
        ) VALUES (
            v_campaign.recipient_id,
            'update_reminder',
            'Time to update your campaign',
            'Your supporters are waiting to hear about the progress of "' || v_campaign.title || '"',
            v_campaign.id,
            next_due,
            3
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on new tables
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_favorites
CREATE POLICY "Users can view all favorites" 
    ON public.user_favorites FOR SELECT 
    USING (true);

CREATE POLICY "Users can manage own favorites" 
    ON public.user_favorites FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for campaign_comments
CREATE POLICY "Comments viewable with campaign" 
    ON public.campaign_comments FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = campaign_comments.campaign_id 
        AND (campaigns.status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR campaigns.recipient_id = auth.uid())
    ));

CREATE POLICY "Users can create comments" 
    ON public.campaign_comments FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" 
    ON public.campaign_comments FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" 
    ON public.campaign_comments FOR DELETE 
    USING (auth.uid() = user_id);

-- RLS Policy for schema_migrations (admin only via service role)
CREATE POLICY "Service role only" 
    ON public.schema_migrations FOR ALL 
    USING (auth.role() = 'service_role');

-- Update existing triggers
CREATE TRIGGER update_campaign_comments_updated_at 
    BEFORE UPDATE ON public.campaign_comments
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.user_favorites TO authenticated;
GRANT ALL ON public.campaign_comments TO authenticated;
GRANT SELECT ON public.schema_migrations TO authenticated;

GRANT EXECUTE ON FUNCTION public.update_campaign_search_vector TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_trending_score TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_last_active TO authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_next_update TO service_role;

-- Add comments for documentation
COMMENT ON COLUMN public.campaigns.search_vector IS 'Full-text search vector for campaign discovery';
COMMENT ON COLUMN public.campaigns.trending_score IS 'Calculated score for trending campaigns based on recent activity';
COMMENT ON COLUMN public.user_profiles.trust_score_last_updated IS 'Timestamp of last trust score calculation';
COMMENT ON COLUMN public.donations.escrow_released IS 'Whether funds have been released from escrow to recipient';
COMMENT ON COLUMN public.campaign_updates.scheduled_for IS 'For scheduling updates to be published in the future';

-- Log migration completion
INSERT INTO public.schema_migrations (version, applied_at) 
VALUES ('008_complete_schema', NOW()) 
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();
