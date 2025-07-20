-- Fixed Safe Migration Script for Blessed-Horizon
-- This version fixes the RLS policy error

-- ================================================
-- STEP 1: Drop existing objects (if any)
-- ================================================

-- Drop existing types if they exist
DROP TYPE IF EXISTS user_verification_status CASCADE;
DROP TYPE IF EXISTS trust_tier CASCADE;
DROP TYPE IF EXISTS campaign_status CASCADE;
DROP TYPE IF EXISTS campaign_need_type CASCADE;
DROP TYPE IF EXISTS update_type CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.media_files CASCADE;
DROP TABLE IF EXISTS public.moderation_queue CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.trust_score_events CASCADE;
DROP TABLE IF EXISTS public.campaign_updates CASCADE;
DROP TABLE IF EXISTS public.donations CASCADE;
DROP TABLE IF EXISTS public.campaign_milestones CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.generate_campaign_slug(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.auto_generate_campaign_slug() CASCADE;
DROP FUNCTION IF EXISTS public.is_campaign_owner(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- ================================================
-- STEP 2: Now create everything fresh
-- ================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE user_verification_status AS ENUM ('unverified', 'email_verified', 'kyc_basic', 'kyc_advanced', 'kyc_full');
CREATE TYPE trust_tier AS ENUM ('NEW', 'RISING', 'STEADY', 'TRUSTED', 'STAR');
CREATE TYPE campaign_status AS ENUM ('DRAFT', 'PENDING_REVIEW', 'FUNDING', 'FUNDED', 'COMPLETED', 'REJECTED', 'CANCELLED');
CREATE TYPE campaign_need_type AS ENUM ('EMERGENCY', 'COMMUNITY_LONG_TERM');
CREATE TYPE update_type AS ENUM ('TEXT', 'PHOTO', 'VIDEO', 'RECEIPT');
CREATE TYPE notification_type AS ENUM ('campaign_update', 'donation_received', 'milestone_reached', 'update_reminder', 'trust_score_change');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');

-- User profiles table (extends auth.users)
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    country_iso CHAR(2) NOT NULL,
    preferred_language CHAR(2) DEFAULT 'en',
    date_of_birth DATE,
    phone_number VARCHAR(20),
    verification_status user_verification_status DEFAULT 'unverified',
    kyc_data JSONB DEFAULT '{}',
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    trust_score DECIMAL(5,2) DEFAULT 50.00 CHECK (trust_score >= 0 AND trust_score <= 100),
    trust_tier trust_tier DEFAULT 'NEW',
    total_donated DECIMAL(12,2) DEFAULT 0,
    total_received DECIMAL(12,2) DEFAULT 0,
    campaigns_created INTEGER DEFAULT 0,
    campaigns_supported INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Campaigns table
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES auth.users(id) NOT NULL,
    title VARCHAR(80) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    need_type campaign_need_type NOT NULL,
    goal_amount DECIMAL(12,2) NOT NULL CHECK (goal_amount > 0),
    currency CHAR(3) DEFAULT 'GBP',
    deadline TIMESTAMP WITH TIME ZONE,
    story_markdown TEXT NOT NULL,
    story_html TEXT,
    scripture_reference TEXT,
    budget_breakdown JSONB NOT NULL DEFAULT '[]',
    media_urls JSONB DEFAULT '[]',
    status campaign_status DEFAULT 'DRAFT',
    raised_amount DECIMAL(12,2) DEFAULT 0,
    donor_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    moderation_notes TEXT,
    moderation_score DECIMAL(3,2),
    anti_lavish_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    funded_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_update_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Campaign milestones
CREATE TABLE public.campaign_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    target_amount DECIMAL(12,2) NOT NULL,
    reached_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Donations table
CREATE TABLE public.donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) NOT NULL,
    donor_id UUID REFERENCES auth.users(id),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency CHAR(3) DEFAULT 'GBP',
    payment_intent_id VARCHAR(255) UNIQUE,
    payment_status payment_status DEFAULT 'pending',
    is_anonymous BOOLEAN DEFAULT FALSE,
    donor_name VARCHAR(100),
    donor_email VARCHAR(255),
    message TEXT,
    processing_fee DECIMAL(12,2) DEFAULT 0,
    platform_fee DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Campaign updates
CREATE TABLE public.campaign_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    update_type update_type NOT NULL,
    title VARCHAR(200),
    content_markdown TEXT NOT NULL,
    content_html TEXT,
    media_urls JSONB DEFAULT '[]',
    spend_items JSONB DEFAULT '[]',
    total_spent DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    view_count INTEGER DEFAULT 0,
    reaction_counts JSONB DEFAULT '{}'
);

-- Trust score events
CREATE TABLE public.trust_score_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    score_impact DECIMAL(5,2) NOT NULL,
    old_score DECIMAL(5,2) NOT NULL,
    new_score DECIMAL(5,2) NOT NULL,
    old_tier trust_tier NOT NULL,
    new_tier trust_tier NOT NULL,
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    type notification_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    is_email_sent BOOLEAN DEFAULT FALSE,
    is_push_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Messages
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    recipient_id UUID REFERENCES auth.users(id) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Moderation queue
CREATE TABLE public.moderation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    moderator_id UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'pending',
    ai_analysis JSONB DEFAULT '{}',
    moderator_notes TEXT,
    decision VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Storage buckets tracking
CREATE TABLE public.media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bucket_name VARCHAR(100) NOT NULL,
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES auth.users(id),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    update_id UUID REFERENCES public.campaign_updates(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create indexes
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_recipient ON public.campaigns(recipient_id);
CREATE INDEX idx_campaigns_created ON public.campaigns(created_at DESC);
CREATE INDEX idx_campaigns_slug ON public.campaigns(slug);
CREATE INDEX idx_donations_campaign ON public.donations(campaign_id);
CREATE INDEX idx_donations_donor ON public.donations(donor_id);
CREATE INDEX idx_donations_created ON public.donations(created_at DESC);
CREATE INDEX idx_updates_campaign ON public.campaign_updates(campaign_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX idx_trust_events_user ON public.trust_score_events(user_id);
CREATE INDEX idx_messages_campaign ON public.messages(campaign_id);
CREATE INDEX idx_messages_recipient ON public.messages(recipient_id, is_read);
CREATE INDEX idx_campaigns_search ON public.campaigns USING gin(to_tsvector('english', title || ' ' || story_markdown));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_updates_updated_at BEFORE UPDATE ON public.campaign_updates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create campaign slug functions
CREATE OR REPLACE FUNCTION public.generate_campaign_slug(title TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    base_slug := lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    final_slug := base_slug;
    
    WHILE EXISTS (SELECT 1 FROM public.campaigns WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.auto_generate_campaign_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := public.generate_campaign_slug(NEW.title);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_campaign_slug BEFORE INSERT ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION public.auto_generate_campaign_slug();

-- ================================================
-- STEP 3: Enable Row Level Security
-- ================================================

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
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.user_profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can update own profile" 
    ON public.user_profiles FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON public.user_profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Campaign Policies
CREATE POLICY "Public campaigns are viewable by everyone" 
    ON public.campaigns FOR SELECT 
    USING (status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR recipient_id = auth.uid());

CREATE POLICY "Users can create their own campaigns" 
    ON public.campaigns FOR INSERT 
    WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "Users can update their own campaigns" 
    ON public.campaigns FOR UPDATE 
    USING (auth.uid() = recipient_id)
    WITH CHECK (auth.uid() = recipient_id);

-- Campaign Milestones Policies
CREATE POLICY "Milestones viewable with campaign" 
    ON public.campaign_milestones FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = campaign_milestones.campaign_id 
        AND (campaigns.status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR campaigns.recipient_id = auth.uid())
    ));

CREATE POLICY "Campaign owners can manage milestones" 
    ON public.campaign_milestones FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = campaign_milestones.campaign_id 
        AND campaigns.recipient_id = auth.uid()
    ));

-- Donation Policies
CREATE POLICY "Users can view own donations" 
    ON public.donations FOR SELECT 
    USING (donor_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = donations.campaign_id 
        AND campaigns.recipient_id = auth.uid()
    ));

CREATE POLICY "Anyone can create donations" 
    ON public.donations FOR INSERT 
    WITH CHECK (true);

-- Campaign Updates Policies
CREATE POLICY "Updates viewable with campaign" 
    ON public.campaign_updates FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = campaign_updates.campaign_id 
        AND (campaigns.status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR campaigns.recipient_id = auth.uid())
    ));

CREATE POLICY "Campaign owners can create updates" 
    ON public.campaign_updates FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = campaign_updates.campaign_id 
        AND campaigns.recipient_id = auth.uid()
    ));

CREATE POLICY "Campaign owners can update their updates" 
    ON public.campaign_updates FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = campaign_updates.campaign_id 
        AND campaigns.recipient_id = auth.uid()
    ));

-- Trust Score Events Policies
CREATE POLICY "Users can view own trust events" 
    ON public.trust_score_events FOR SELECT 
    USING (user_id = auth.uid());

-- Notification Policies
CREATE POLICY "Users can view own notifications" 
    ON public.notifications FOR SELECT 
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" 
    ON public.notifications FOR UPDATE 
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Message Policies (FIXED)
CREATE POLICY "Users can view own messages" 
    ON public.messages FOR SELECT 
    USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send messages" 
    ON public.messages FOR INSERT 
    WITH CHECK (sender_id = auth.uid());

-- FIXED: Removed OLD.recipient_id reference
CREATE POLICY "Recipients can mark messages as read" 
    ON public.messages FOR UPDATE 
    USING (recipient_id = auth.uid())
    WITH CHECK (recipient_id = auth.uid());

-- Media Files Policies
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

CREATE POLICY "Users can upload own files" 
    ON public.media_files FOR INSERT 
    WITH CHECK (uploaded_by = auth.uid());

-- Create helper functions
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
    RETURN (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ================================================
-- FINAL: Test the setup
-- ================================================

-- Show created tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- ================================================
-- SUCCESS! Now create storage buckets manually
-- ================================================
