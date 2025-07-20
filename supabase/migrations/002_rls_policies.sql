-- Row Level Security (RLS) policies for Blessed-Horizon
-- This migration sets up comprehensive security policies for all tables

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
-- Everyone can view profiles (public information)
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.user_profiles FOR SELECT 
    USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
    ON public.user_profiles FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Only the user can insert their own profile
CREATE POLICY "Users can insert own profile" 
    ON public.user_profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Campaign Policies
-- Public campaigns are viewable by everyone
CREATE POLICY "Public campaigns are viewable by everyone" 
    ON public.campaigns FOR SELECT 
    USING (status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR recipient_id = auth.uid());

-- Users can create their own campaigns
CREATE POLICY "Users can create their own campaigns" 
    ON public.campaigns FOR INSERT 
    WITH CHECK (auth.uid() = recipient_id);

-- Users can update their own campaigns
CREATE POLICY "Users can update their own campaigns" 
    ON public.campaigns FOR UPDATE 
    USING (auth.uid() = recipient_id)
    WITH CHECK (auth.uid() = recipient_id);

-- Campaign Milestones Policies
-- Milestones are viewable if campaign is viewable
CREATE POLICY "Milestones viewable with campaign" 
    ON public.campaign_milestones FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = campaign_milestones.campaign_id 
        AND (campaigns.status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR campaigns.recipient_id = auth.uid())
    ));

-- Campaign owners can manage milestones
CREATE POLICY "Campaign owners can manage milestones" 
    ON public.campaign_milestones FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = campaign_milestones.campaign_id 
        AND campaigns.recipient_id = auth.uid()
    ));

-- Donation Policies
-- Users can view their own donations
CREATE POLICY "Users can view own donations" 
    ON public.donations FOR SELECT 
    USING (donor_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = donations.campaign_id 
        AND campaigns.recipient_id = auth.uid()
    ));

-- Anyone can create donations (including guests)
CREATE POLICY "Anyone can create donations" 
    ON public.donations FOR INSERT 
    WITH CHECK (true);

-- Campaign Updates Policies
-- Updates are viewable if campaign is viewable
CREATE POLICY "Updates viewable with campaign" 
    ON public.campaign_updates FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = campaign_updates.campaign_id 
        AND (campaigns.status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR campaigns.recipient_id = auth.uid())
    ));

-- Campaign owners can create updates
CREATE POLICY "Campaign owners can create updates" 
    ON public.campaign_updates FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = campaign_updates.campaign_id 
        AND campaigns.recipient_id = auth.uid()
    ));

-- Campaign owners can update their updates
CREATE POLICY "Campaign owners can update their updates" 
    ON public.campaign_updates FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = campaign_updates.campaign_id 
        AND campaigns.recipient_id = auth.uid()
    ));

-- Trust Score Events Policies
-- Users can view their own trust score events
CREATE POLICY "Users can view own trust events" 
    ON public.trust_score_events FOR SELECT 
    USING (user_id = auth.uid());

-- Only system can insert trust events (via service role)
-- No INSERT policy for regular users

-- Notification Policies
-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" 
    ON public.notifications FOR SELECT 
    USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" 
    ON public.notifications FOR UPDATE 
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Message Policies
-- Users can view messages they sent or received
CREATE POLICY "Users can view own messages" 
    ON public.messages FOR SELECT 
    USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Users can send messages
CREATE POLICY "Users can send messages" 
    ON public.messages FOR INSERT 
    WITH CHECK (sender_id = auth.uid());

-- Recipients can update messages (mark as read)
CREATE POLICY "Recipients can mark messages as read" 
    ON public.messages FOR UPDATE 
    USING (recipient_id = auth.uid())
    WITH CHECK (recipient_id = auth.uid() AND recipient_id = OLD.recipient_id);

-- Moderation Queue Policies
-- Only admins can view moderation queue (implemented via service role)
-- No policies for regular users

-- Media Files Policies
-- Files are viewable if associated campaign/update is viewable
CREATE POLICY "Media files viewable with content" 
    ON public.media_files FOR SELECT 
    USING (
        (campaign_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.campaigns 
            WHERE campaigns.id = media_files.campaign_id 
            AND (campaigns.status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR campaigns.recipient_id = auth.uid())
        ))
        OR
        (update_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.campaign_updates cu
            JOIN public.campaigns c ON c.id = cu.campaign_id
            WHERE cu.id = media_files.update_id 
            AND (c.status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR c.recipient_id = auth.uid())
        ))
        OR uploaded_by = auth.uid()
    );

-- Users can upload their own files
CREATE POLICY "Users can upload own files" 
    ON public.media_files FOR INSERT 
    WITH CHECK (uploaded_by = auth.uid());

-- Create helper functions for common RLS checks
CREATE OR REPLACE FUNCTION public.is_campaign_owner(campaign_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE id = campaign_id 
        AND recipient_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has admin role in user metadata
    RETURN (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
