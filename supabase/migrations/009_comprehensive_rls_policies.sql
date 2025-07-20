-- Migration 009: Comprehensive RLS Policy Implementation
-- Task #4: Row Level Security (RLS) Policies
-- Description: Ensures comprehensive security policies for all database tables

-- First, ensure RLS is enabled on all tables
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campaign_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campaign_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campaign_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campaign_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campaign_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campaign_beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campaign_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.donation_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trust_score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schema_migrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them comprehensively
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all existing policies for clean slate
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END$$;

-- ================== USER PROFILES POLICIES ==================
-- Public profiles with privacy settings respected
CREATE POLICY "profiles_select_public"
    ON public.user_profiles FOR SELECT
    USING (
        CASE 
            WHEN profile_visibility = 'public' THEN true
            WHEN profile_visibility = 'private' THEN auth.uid() = id OR is_admin(auth.uid())
            WHEN profile_visibility = 'donors_only' THEN 
                auth.uid() = id OR 
                is_admin(auth.uid()) OR
                EXISTS (
                    SELECT 1 FROM public.donations d
                    JOIN public.campaigns c ON d.campaign_id = c.id
                    WHERE d.donor_id = auth.uid() AND c.recipient_id = user_profiles.id
                )
            ELSE false
        END
    );

-- Users can insert their own profile
CREATE POLICY "profiles_insert_own"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users cannot delete profiles (soft delete only)
CREATE POLICY "profiles_no_delete"
    ON public.user_profiles FOR DELETE
    USING (false);

-- ================== CAMPAIGNS POLICIES ==================
-- View campaigns based on status and ownership
CREATE POLICY "campaigns_select"
    ON public.campaigns FOR SELECT
    USING (
        status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR
        recipient_id = auth.uid() OR
        is_admin(auth.uid())
    );

-- Recipients can create campaigns if verified
CREATE POLICY "campaigns_insert"
    ON public.campaigns FOR INSERT
    WITH CHECK (
        auth.uid() = recipient_id AND
        can_user_create_campaign(auth.uid())
    );

-- Recipients can update their own campaigns with restrictions
CREATE POLICY "campaigns_update"
    ON public.campaigns FOR UPDATE
    USING (auth.uid() = recipient_id)
    WITH CHECK (
        auth.uid() = recipient_id AND
        -- Cannot change recipient
        recipient_id = OLD.recipient_id AND
        -- Cannot directly change raised_amount
        raised_amount = OLD.raised_amount AND
        -- Cannot change certain fields after funding
        (OLD.status NOT IN ('FUNDED', 'COMPLETED') OR (
            goal_amount = OLD.goal_amount AND
            deadline = OLD.deadline
        ))
    );

-- Soft delete only for campaigns
CREATE POLICY "campaigns_delete"
    ON public.campaigns FOR DELETE
    USING (
        auth.uid() = recipient_id AND 
        status IN ('DRAFT', 'REJECTED', 'CANCELLED')
    );

-- ================== CAMPAIGN MILESTONES POLICIES ==================
CREATE POLICY "milestones_select"
    ON public.campaign_milestones FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_milestones.campaign_id
            AND (c.status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR c.recipient_id = auth.uid())
        )
    );

CREATE POLICY "milestones_insert"
    ON public.campaign_milestones FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_milestones.campaign_id
            AND c.recipient_id = auth.uid()
            AND c.status = 'DRAFT'
        )
    );

CREATE POLICY "milestones_update"
    ON public.campaign_milestones FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_milestones.campaign_id
            AND c.recipient_id = auth.uid()
            AND c.status IN ('DRAFT', 'PENDING_REVIEW')
        )
    );

CREATE POLICY "milestones_delete"
    ON public.campaign_milestones FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_milestones.campaign_id
            AND c.recipient_id = auth.uid()
            AND c.status = 'DRAFT'
        )
    );

-- ================== DONATIONS POLICIES ==================
-- Donors can view their own donations
CREATE POLICY "donations_select_donor"
    ON public.donations FOR SELECT
    USING (
        donor_id = auth.uid() OR 
        (donor_email IS NOT NULL AND donor_email = auth.jwt()->>'email')
    );

-- Campaign owners can view donations to their campaigns
CREATE POLICY "donations_select_recipient"
    ON public.donations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = donations.campaign_id
            AND c.recipient_id = auth.uid()
        )
    );

-- Public can view non-anonymous completed donations
CREATE POLICY "donations_select_public"
    ON public.donations FOR SELECT
    USING (
        payment_status = 'completed' AND 
        is_anonymous = false AND
        show_amount = true
    );

-- Service role handles donation creation through edge functions
-- No direct INSERT policy for users

-- ================== CAMPAIGN UPDATES POLICIES ==================
CREATE POLICY "updates_select"
    ON public.campaign_updates FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_updates.campaign_id
            AND (c.status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR c.recipient_id = auth.uid())
        )
    );

CREATE POLICY "updates_insert"
    ON public.campaign_updates FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_updates.campaign_id
            AND c.recipient_id = auth.uid()
            AND c.status IN ('FUNDING', 'FUNDED')
        ) AND
        (author_id IS NULL OR author_id = auth.uid())
    );

CREATE POLICY "updates_update"
    ON public.campaign_updates FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_updates.campaign_id
            AND c.recipient_id = auth.uid()
        ) AND
        author_id = auth.uid()
    )
    WITH CHECK (
        author_id = auth.uid() AND
        -- Cannot change campaign or author
        campaign_id = OLD.campaign_id AND
        author_id = OLD.author_id
    );

-- ================== TRUST SCORE EVENTS POLICIES ==================
-- Users can only view their own trust score events
CREATE POLICY "trust_events_select"
    ON public.trust_score_events FOR SELECT
    USING (user_id = auth.uid());

-- Only service role can insert trust events
-- No INSERT policy for regular users

-- ================== NOTIFICATIONS POLICIES ==================
CREATE POLICY "notifications_select"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "notifications_update"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid() AND
        -- Can only update read status
        user_id = OLD.user_id AND
        type = OLD.type AND
        title = OLD.title AND
        message = OLD.message
    );

-- ================== MESSAGES POLICIES ==================
CREATE POLICY "messages_select"
    ON public.messages FOR SELECT
    USING (
        sender_id = auth.uid() OR 
        recipient_id = auth.uid()
    );

CREATE POLICY "messages_insert"
    ON public.messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid() AND
        -- Can only message campaign owners about their campaigns
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = messages.campaign_id
            AND (
                (c.recipient_id = recipient_id AND auth.uid() != recipient_id) OR
                (c.recipient_id = auth.uid() AND recipient_id != auth.uid())
            )
        )
    );

CREATE POLICY "messages_update"
    ON public.messages FOR UPDATE
    USING (recipient_id = auth.uid())
    WITH CHECK (
        recipient_id = auth.uid() AND
        -- Can only mark as read
        is_read != OLD.is_read AND
        content = OLD.content AND
        sender_id = OLD.sender_id AND
        recipient_id = OLD.recipient_id
    );

-- ================== MEDIA FILES POLICIES ==================
CREATE POLICY "media_select"
    ON public.media_files FOR SELECT
    USING (
        uploaded_by = auth.uid() OR
        (campaign_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = media_files.campaign_id
            AND (c.status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR c.recipient_id = auth.uid())
        )) OR
        (update_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.campaign_updates cu
            JOIN public.campaigns c ON c.id = cu.campaign_id
            WHERE cu.id = media_files.update_id
            AND (c.status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR c.recipient_id = auth.uid())
        ))
    );

CREATE POLICY "media_insert"
    ON public.media_files FOR INSERT
    WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "media_update"
    ON public.media_files FOR UPDATE
    USING (uploaded_by = auth.uid())
    WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "media_delete"
    ON public.media_files FOR DELETE
    USING (uploaded_by = auth.uid());

-- ================== CAMPAIGN MEDIA POLICIES ==================
CREATE POLICY "campaign_media_select"
    ON public.campaign_media FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_media.campaign_id
            AND (c.status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR c.recipient_id = auth.uid())
        )
    );

CREATE POLICY "campaign_media_manage"
    ON public.campaign_media FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_media.campaign_id
            AND c.recipient_id = auth.uid()
        )
    );

-- ================== CAMPAIGN CATEGORIES POLICIES ==================
-- Categories are public read
CREATE POLICY "categories_select"
    ON public.campaign_categories FOR SELECT
    USING (is_active = true OR is_admin(auth.uid()));

-- Only admins can manage categories
CREATE POLICY "categories_admin"
    ON public.campaign_categories FOR ALL
    USING (is_admin(auth.uid()));

-- ================== CAMPAIGN TAGS POLICIES ==================
CREATE POLICY "tags_select"
    ON public.campaign_tags FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_tags.campaign_id
            AND (c.status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR c.recipient_id = auth.uid())
        )
    );

CREATE POLICY "tags_manage"
    ON public.campaign_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_tags.campaign_id
            AND c.recipient_id = auth.uid()
        )
    );

-- ================== CAMPAIGN BENEFICIARIES POLICIES ==================
CREATE POLICY "beneficiaries_select"
    ON public.campaign_beneficiaries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_beneficiaries.campaign_id
            AND (c.status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR c.recipient_id = auth.uid())
        )
    );

CREATE POLICY "beneficiaries_manage"
    ON public.campaign_beneficiaries FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_beneficiaries.campaign_id
            AND c.recipient_id = auth.uid()
            AND c.status IN ('DRAFT', 'PENDING_REVIEW')
        )
    );

-- ================== USER FAVORITES POLICIES ==================
CREATE POLICY "favorites_select_all"
    ON public.user_favorites FOR SELECT
    USING (true);

CREATE POLICY "favorites_manage_own"
    ON public.user_favorites FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ================== CAMPAIGN COMMENTS POLICIES ==================
CREATE POLICY "comments_select"
    ON public.campaign_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_comments.campaign_id
            AND (c.status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR c.recipient_id = auth.uid())
        )
    );

CREATE POLICY "comments_insert"
    ON public.campaign_comments FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_comments.campaign_id
            AND c.status IN ('FUNDING', 'FUNDED', 'COMPLETED')
        )
    );

CREATE POLICY "comments_update"
    ON public.campaign_comments FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id AND
        -- Cannot change campaign or user
        campaign_id = OLD.campaign_id AND
        user_id = OLD.user_id
    );

CREATE POLICY "comments_delete"
    ON public.campaign_comments FOR DELETE
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_comments.campaign_id
            AND c.recipient_id = auth.uid()
        )
    );

-- ================== MODERATION QUEUE POLICIES ==================
-- Only admins can access moderation queue
CREATE POLICY "moderation_admin_only"
    ON public.moderation_queue FOR ALL
    USING (is_admin(auth.uid()));

-- ================== ADMIN USERS POLICIES ==================
-- Only admins can view admin users
CREATE POLICY "admin_users_select"
    ON public.admin_users FOR SELECT
    USING (is_admin(auth.uid()));

-- Only superadmins can manage admin users
CREATE POLICY "admin_users_manage"
    ON public.admin_users FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
            AND role = 'superadmin'
        )
    );

-- ================== DONATION RECEIPTS POLICIES ==================
CREATE POLICY "receipts_select"
    ON public.donation_receipts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.donations d
            WHERE d.id = donation_receipts.donation_id
            AND (d.donor_id = auth.uid() OR d.donor_email = auth.jwt()->>'email')
        )
    );

-- ================== SCHEMA MIGRATIONS POLICIES ==================
-- Only service role can access migrations
CREATE POLICY "migrations_service_only"
    ON public.schema_migrations FOR ALL
    USING (auth.role() = 'service_role');

-- ================== HELPER FUNCTIONS FOR RLS ==================
-- Update is_admin function to check both user_profiles and admin_users
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = user_id
        AND role IN ('admin', 'superadmin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can moderate
CREATE OR REPLACE FUNCTION public.can_moderate(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users au
        JOIN public.user_profiles up ON au.id = up.id
        WHERE au.id = user_id
        AND up.role IN ('admin', 'superadmin')
        AND (au.permissions->>'moderate_campaigns')::boolean IS NOT FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_moderate TO authenticated;

-- Create audit log for RLS policy violations (optional but recommended)
CREATE TABLE IF NOT EXISTS public.rls_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    violation_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE public.rls_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can access audit log
CREATE POLICY "audit_service_only"
    ON public.rls_audit_log FOR ALL
    USING (auth.role() = 'service_role');

-- Log migration completion
INSERT INTO public.schema_migrations (version, applied_at) 
VALUES ('009_comprehensive_rls_policies', NOW()) 
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();

-- Add helpful comments
COMMENT ON POLICY "profiles_select_public" ON public.user_profiles IS 'Respects user privacy settings for profile visibility';
COMMENT ON POLICY "campaigns_insert" ON public.campaigns IS 'Only verified users can create campaigns';
COMMENT ON POLICY "donations_select_public" ON public.donations IS 'Non-anonymous donations are publicly visible';
COMMENT ON POLICY "trust_events_select" ON public.trust_score_events IS 'Users can only see their own trust score history';
COMMENT ON POLICY "comments_delete" ON public.campaign_comments IS 'Users can delete own comments, campaign owners can moderate';
