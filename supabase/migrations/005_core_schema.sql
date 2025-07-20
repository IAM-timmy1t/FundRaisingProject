-- Migration 005: Core Schema Implementation for Blessed-Horizon
-- Faith-based transparent crowdfunding platform
-- Created: 2024-01-XX
-- Description: Implements core database tables for campaigns, donations, trust scoring, and notifications

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For composite indexes

-- Create additional custom types for enhanced functionality
DO $$ BEGIN
    CREATE TYPE campaign_urgency AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE donation_frequency AS ENUM ('ONE_TIME', 'WEEKLY', 'MONTHLY', 'QUARTERLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE trust_event_type AS ENUM (
        'PROFILE_COMPLETION', 'TIMELY_UPDATE', 'LATE_UPDATE', 'SPENDING_TRANSPARENCY',
        'COMMUNITY_FEEDBACK', 'VERIFICATION_COMPLETED', 'CAMPAIGN_COMPLETED',
        'FUNDS_MISUSED', 'POSITIVE_REVIEW', 'NEGATIVE_REVIEW'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enhanced User Profiles Table (extends existing if present)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    country_iso CHAR(2) NOT NULL,
    state_province VARCHAR(100),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    preferred_language CHAR(2) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_of_birth DATE,
    phone_number VARCHAR(20),
    phone_verified BOOLEAN DEFAULT FALSE,
    
    -- Verification and Trust
    verification_status user_verification_status DEFAULT 'unverified',
    kyc_data JSONB DEFAULT '{}',
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    trust_score DECIMAL(5,2) DEFAULT 50.00 CHECK (trust_score >= 0 AND trust_score <= 100),
    trust_tier trust_tier DEFAULT 'NEW',
    trust_score_last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Platform Statistics
    total_donated DECIMAL(12,2) DEFAULT 0 CHECK (total_donated >= 0),
    total_received DECIMAL(12,2) DEFAULT 0 CHECK (total_received >= 0),
    campaigns_created INTEGER DEFAULT 0 CHECK (campaigns_created >= 0),
    campaigns_supported INTEGER DEFAULT 0 CHECK (campaigns_supported >= 0),
    successful_campaigns INTEGER DEFAULT 0 CHECK (successful_campaigns >= 0),
    
    -- Profile Metadata
    bio TEXT,
    profile_image_url TEXT,
    cover_image_url TEXT,
    social_links JSONB DEFAULT '{}', -- {facebook, twitter, instagram, website}
    interests JSONB DEFAULT '[]', -- Array of interest categories
    
    -- Privacy Settings
    profile_visibility VARCHAR(20) DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'donors_only')),
    show_donation_history BOOLEAN DEFAULT TRUE,
    allow_messages BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaigns Table - Core fundraising campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES auth.users(id) NOT NULL,
    
    -- Basic Campaign Info
    title VARCHAR(80) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    subtitle VARCHAR(150),
    need_type campaign_need_type NOT NULL,
    urgency campaign_urgency DEFAULT 'MEDIUM',
    category VARCHAR(50) NOT NULL, -- 'medical', 'education', 'community', 'emergency', etc.
    tags JSONB DEFAULT '[]', -- Array of tags for searchability
    
    -- Financial Details
    goal_amount DECIMAL(12,2) NOT NULL CHECK (goal_amount > 0),
    currency CHAR(3) DEFAULT 'GBP',
    raised_amount DECIMAL(12,2) DEFAULT 0 CHECK (raised_amount >= 0),
    withdrawn_amount DECIMAL(12,2) DEFAULT 0 CHECK (withdrawn_amount >= 0),
    escrow_amount DECIMAL(12,2) DEFAULT 0 CHECK (escrow_amount >= 0),
    
    -- Timeline
    deadline TIMESTAMP WITH TIME ZONE,
    funding_deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Content
    story_markdown TEXT NOT NULL,
    story_html TEXT,
    scripture_reference TEXT,
    prayer_request TEXT,
    
    -- Budget and Planning
    budget_breakdown JSONB NOT NULL DEFAULT '[]', -- Array of budget items
    expected_outcomes JSONB DEFAULT '[]', -- Array of expected outcomes
    beneficiaries JSONB DEFAULT '[]', -- Array of beneficiary information
    
    -- Media
    featured_image_url TEXT,
    media_urls JSONB DEFAULT '[]', -- Array of image/video URLs
    document_urls JSONB DEFAULT '[]', -- Array of supporting documents
    
    -- Campaign Status and Metrics
    status campaign_status DEFAULT 'DRAFT',
    donor_count INTEGER DEFAULT 0 CHECK (donor_count >= 0),
    view_count INTEGER DEFAULT 0 CHECK (view_count >= 0),
    share_count INTEGER DEFAULT 0 CHECK (share_count >= 0),
    favorite_count INTEGER DEFAULT 0 CHECK (favorite_count >= 0),
    
    -- Location
    country_iso CHAR(2),
    state_province VARCHAR(100),
    city VARCHAR(100),
    location_description TEXT,
    coordinates POINT, -- PostGIS point for location
    
    -- Moderation and Trust
    moderation_status VARCHAR(20) DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
    moderation_notes TEXT,
    moderation_score DECIMAL(3,2),
    flagged_count INTEGER DEFAULT 0,
    
    -- Update Requirements
    next_update_due TIMESTAMP WITH TIME ZONE,
    update_frequency_days INTEGER DEFAULT 14, -- How often updates are required
    overdue_updates_count INTEGER DEFAULT 0,
    
    -- Campaign Performance
    conversion_rate DECIMAL(5,4) DEFAULT 0, -- Views to donations ratio
    average_donation DECIMAL(10,2) DEFAULT 0,
    repeat_donor_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Search and Discovery
    search_vector tsvector, -- Full-text search vector
    featured BOOLEAN DEFAULT FALSE,
    trending_score DECIMAL(10,2) DEFAULT 0,
    
    CONSTRAINT valid_deadline CHECK (deadline IS NULL OR deadline > created_at),
    CONSTRAINT valid_amounts CHECK (raised_amount <= goal_amount * 1.5), -- Allow 150% funding
    CONSTRAINT valid_withdrawn CHECK (withdrawn_amount <= raised_amount)
);

-- Campaign Updates Table - Mandatory progress updates
CREATE TABLE IF NOT EXISTS public.campaign_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES auth.users(id) NOT NULL,
    
    -- Update Content
    title VARCHAR(100) NOT NULL,
    content_markdown TEXT NOT NULL,
    content_html TEXT,
    update_type update_type DEFAULT 'TEXT',
    
    -- Financial Transparency
    amount_spent DECIMAL(12,2) DEFAULT 0 CHECK (amount_spent >= 0),
    spending_breakdown JSONB DEFAULT '[]', -- Array of spending items with receipts
    remaining_funds DECIMAL(12,2) DEFAULT 0 CHECK (remaining_funds >= 0),
    
    -- Media and Documentation
    media_urls JSONB DEFAULT '[]', -- Progress photos/videos
    receipt_urls JSONB DEFAULT '[]', -- Receipt/invoice images
    document_urls JSONB DEFAULT '[]', -- Supporting documents
    
    -- Update Metadata
    is_milestone BOOLEAN DEFAULT FALSE,
    milestone_percentage INTEGER CHECK (milestone_percentage >= 0 AND milestone_percentage <= 100),
    
    -- Engagement
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    
    -- Moderation
    moderation_status VARCHAR(20) DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    flagged BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_for TIMESTAMP WITH TIME ZONE, -- For scheduled updates
    
    -- Constraints
    CONSTRAINT valid_spending CHECK (amount_spent <= (SELECT raised_amount FROM campaigns WHERE id = campaign_id))
);

-- Donations Table - All financial contributions
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    donor_id UUID REFERENCES auth.users(id), -- NULL for anonymous donations
    
    -- Donation Details
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency CHAR(3) DEFAULT 'GBP',
    frequency donation_frequency DEFAULT 'ONE_TIME',
    
    -- Payment Information
    payment_method VARCHAR(50), -- 'stripe', 'paypal', 'bank_transfer', etc.
    payment_intent_id VARCHAR(255), -- Stripe payment intent ID
    transaction_id VARCHAR(255), -- External transaction reference
    payment_status payment_status DEFAULT 'pending',
    
    -- Donor Information (for anonymous donations)
    donor_name VARCHAR(100), -- Used when donor_id is NULL
    donor_email VARCHAR(255), -- Used when donor_id is NULL
    is_anonymous BOOLEAN DEFAULT FALSE,
    
    -- Message and Interaction
    message TEXT, -- Donor's message to recipient
    prayer_request TEXT, -- Specific prayer request
    show_amount BOOLEAN DEFAULT TRUE, -- Whether to show donation amount publicly
    
    -- Gift Aid and Tax (UK specific)
    gift_aid_eligible BOOLEAN DEFAULT FALSE,
    gift_aid_claimed BOOLEAN DEFAULT FALSE,
    tax_relief_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Fees and Processing
    platform_fee DECIMAL(10,2) DEFAULT 0,
    payment_processing_fee DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(12,2) NOT NULL, -- Amount after fees
    
    -- Escrow and Release
    escrow_released BOOLEAN DEFAULT FALSE,
    escrow_released_at TIMESTAMP WITH TIME ZONE,
    release_trigger VARCHAR(50), -- 'manual', 'automatic', 'milestone'
    
    -- Refund Information
    refunded BOOLEAN DEFAULT FALSE,
    refund_amount DECIMAL(12,2) DEFAULT 0,
    refund_reason TEXT,
    refunded_at TIMESTAMP WITH TIME ZONE,
    
    -- Recurring Donations
    subscription_id VARCHAR(255), -- For recurring donations
    next_payment_date TIMESTAMP WITH TIME ZONE,
    recurring_active BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    ip_address INET, -- For fraud detection
    user_agent TEXT, -- For fraud detection
    referrer_url TEXT, -- How they found the campaign
    utm_source VARCHAR(100), -- Marketing attribution
    utm_campaign VARCHAR(100),
    utm_medium VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_net_amount CHECK (net_amount = amount - platform_fee - payment_processing_fee),
    CONSTRAINT valid_refund CHECK (refund_amount <= amount)
);

-- Trust Score Events Table - Trust scoring history and calculations
CREATE TABLE IF NOT EXISTS public.trust_score_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Event Details
    event_type trust_event_type NOT NULL,
    event_description TEXT,
    
    -- Score Impact
    score_change DECIMAL(5,2) NOT NULL, -- Can be positive or negative
    previous_score DECIMAL(5,2) NOT NULL,
    new_score DECIMAL(5,2) NOT NULL,
    
    -- Related Objects
    campaign_id UUID REFERENCES public.campaigns(id), -- If event relates to a campaign
    donation_id UUID REFERENCES public.donations(id), -- If event relates to a donation
    update_id UUID REFERENCES public.campaign_updates(id), -- If event relates to an update
    
    -- Event Metadata
    weight DECIMAL(3,2) DEFAULT 1.0, -- Weight of this event in calculations
    automated BOOLEAN DEFAULT TRUE, -- Whether this was automatically calculated
    reviewed_by UUID REFERENCES auth.users(id), -- Admin who reviewed manual events
    
    -- Additional Data
    metadata JSONB DEFAULT '{}', -- Additional event-specific data
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Some events may expire
    
    -- Constraints
    CONSTRAINT valid_score_range CHECK (previous_score >= 0 AND previous_score <= 100 AND new_score >= 0 AND new_score <= 100),
    CONSTRAINT valid_score_change CHECK (new_score = previous_score + score_change)
);

-- Notifications Table - User communication and alerts
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Notification Content
    type notification_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    -- Rich Content
    action_url TEXT, -- URL to navigate to when clicked
    action_text VARCHAR(50), -- Text for action button
    image_url TEXT, -- Optional image for notification
    
    -- Related Objects
    campaign_id UUID REFERENCES public.campaigns(id),
    donation_id UUID REFERENCES public.donations(id),
    update_id UUID REFERENCES public.campaign_updates(id),
    
    -- Delivery Status
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Delivery Channels
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    push_sent BOOLEAN DEFAULT FALSE,
    push_sent_at TIMESTAMP WITH TIME ZONE,
    sms_sent BOOLEAN DEFAULT FALSE,
    sms_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Priority and Scheduling
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10), -- 1 = highest, 10 = lowest
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}', -- Additional notification data
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign Categories Table - Predefined campaign categories
CREATE TABLE IF NOT EXISTS public.campaign_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon_name VARCHAR(50), -- Icon identifier for UI
    color_hex CHAR(7), -- Hex color code for category
    parent_category_id UUID REFERENCES public.campaign_categories(id),
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Favorites Table - Users can favorite campaigns
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, campaign_id)
);

-- Campaign Comments Table - Comments and prayers on campaigns
CREATE TABLE IF NOT EXISTS public.campaign_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id UUID REFERENCES public.campaign_comments(id), -- For threaded comments
    
    content TEXT NOT NULL,
    is_prayer BOOLEAN DEFAULT FALSE, -- Whether this is a prayer request/offer
    is_anonymous BOOLEAN DEFAULT FALSE,
    
    -- Moderation
    flagged BOOLEAN DEFAULT FALSE,
    moderation_status VARCHAR(20) DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    
    -- Engagement
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_user_profiles_trust_score ON public.user_profiles(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_country ON public.user_profiles(country_iso);
CREATE INDEX IF NOT EXISTS idx_user_profiles_verification ON public.user_profiles(verification_status);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON public.campaigns(category);
CREATE INDEX IF NOT EXISTS idx_campaigns_recipient ON public.campaigns(recipient_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_deadline ON public.campaigns(deadline);
CREATE INDEX IF NOT EXISTS idx_campaigns_featured ON public.campaigns(featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_campaigns_location ON public.campaigns(country_iso, state_province, city);
CREATE INDEX IF NOT EXISTS idx_campaigns_search ON public.campaigns USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_campaigns_trending ON public.campaigns(trending_score DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_updates_campaign ON public.campaign_updates(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_updates_author ON public.campaign_updates(author_id);
CREATE INDEX IF NOT EXISTS idx_campaign_updates_milestone ON public.campaign_updates(is_milestone) WHERE is_milestone = TRUE;

CREATE INDEX IF NOT EXISTS idx_donations_campaign ON public.donations(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON public.donations(donor_id) WHERE donor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_donations_status ON public.donations(payment_status);
CREATE INDEX IF NOT EXISTS idx_donations_recurring ON public.donations(subscription_id) WHERE subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trust_score_events_user ON public.trust_score_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trust_score_events_type ON public.trust_score_events(event_type);
CREATE INDEX IF NOT EXISTS idx_trust_score_events_campaign ON public.trust_score_events(campaign_id) WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read, created_at DESC) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON public.notifications(scheduled_for) WHERE scheduled_for > NOW();

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_campaign ON public.user_favorites(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_comments_campaign ON public.campaign_comments(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_comments_user ON public.campaign_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_comments_parent ON public.campaign_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_campaigns_status_category ON public.campaigns(status, category);
CREATE INDEX IF NOT EXISTS idx_campaigns_location_status ON public.campaigns(country_iso, status) WHERE status = 'FUNDING';
CREATE INDEX IF NOT EXISTS idx_donations_campaign_status ON public.donations(campaign_id, payment_status);

-- Add comments for documentation
COMMENT ON TABLE public.user_profiles IS 'Extended user profiles with crowdfunding-specific fields and trust scoring';
COMMENT ON TABLE public.campaigns IS 'Core fundraising campaigns with comprehensive metadata and tracking';
COMMENT ON TABLE public.campaign_updates IS 'Mandatory progress updates from campaign recipients with spending transparency';
COMMENT ON TABLE public.donations IS 'All financial contributions with payment processing and escrow management';
COMMENT ON TABLE public.trust_score_events IS 'Historical events that affect user trust scores with automated calculation support';
COMMENT ON TABLE public.notifications IS 'Multi-channel notification system for user communication';
COMMENT ON TABLE public.campaign_categories IS 'Hierarchical category system for campaign organization';
COMMENT ON TABLE public.user_favorites IS 'User bookmarking system for campaigns';
COMMENT ON TABLE public.campaign_comments IS 'Comments and prayer requests on campaigns with moderation support';

-- Migration completion log
INSERT INTO public.schema_migrations (version, applied_at) 
VALUES ('005_core_schema', NOW()) 
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();