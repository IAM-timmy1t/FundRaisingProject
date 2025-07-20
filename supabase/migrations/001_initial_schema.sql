-- Initial schema for Blessed-Horizon
-- Faith-based transparent crowdfunding platform

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

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
    donor_name VARCHAR(100), -- For guest donations
    donor_email VARCHAR(255), -- For guest donations
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
    spend_items JSONB DEFAULT '[]', -- Array of {description, amount, receipt_url}
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

-- Messages (for donor-recipient communication)
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

-- Create indexes for performance
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

-- Full text search indexes
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

-- Create function to generate campaign slug
CREATE OR REPLACE FUNCTION public.generate_campaign_slug(title TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Convert to lowercase and replace non-alphanumeric with hyphens
    base_slug := lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'));
    -- Remove leading/trailing hyphens
    base_slug := trim(both '-' from base_slug);
    
    final_slug := base_slug;
    
    -- Check for uniqueness and append number if needed
    WHILE EXISTS (SELECT 1 FROM public.campaigns WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug for campaigns
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
