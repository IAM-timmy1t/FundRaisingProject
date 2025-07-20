-- Campaign enhancements for Task #7
-- Adds missing fields, constraints, and indexes for complete campaign functionality

-- Add missing fields to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS location_country CHAR(2),
ADD COLUMN IF NOT EXISTS location_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS location_coordinates POINT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS min_donation_amount DECIMAL(12,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS max_donation_amount DECIMAL(12,2) DEFAULT 50000.00;

-- Add constraints for campaign amounts
ALTER TABLE public.campaigns 
ADD CONSTRAINT check_min_goal_amount CHECK (goal_amount >= 100),
ADD CONSTRAINT check_max_goal_amount CHECK (goal_amount <= 1000000),
ADD CONSTRAINT check_donation_limits CHECK (min_donation_amount < max_donation_amount);

-- Add constraint for deadline
ALTER TABLE public.campaigns 
ADD CONSTRAINT check_deadline_future CHECK (deadline > created_at);

-- Create campaign_media table for better media management
CREATE TABLE IF NOT EXISTS public.campaign_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video', 'document')),
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    file_size INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaign_categories table
CREATE TABLE IF NOT EXISTS public.campaign_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon_name VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO public.campaign_categories (name, slug, description, icon_name, display_order) VALUES
('Medical', 'medical', 'Medical expenses, surgeries, treatments', 'heart', 1),
('Education', 'education', 'School fees, books, educational materials', 'graduation-cap', 2),
('Disaster Relief', 'disaster-relief', 'Emergency response to natural disasters', 'emergency', 3),
('Community', 'community', 'Community projects and initiatives', 'users', 4),
('Religious', 'religious', 'Religious causes and ministry support', 'church', 5),
('Housing', 'housing', 'Housing, shelter, and accommodation needs', 'home', 6),
('Food Security', 'food-security', 'Food and nutrition assistance', 'utensils', 7),
('Other', 'other', 'Other charitable causes', 'hand-heart', 8)
ON CONFLICT (slug) DO NOTHING;

-- Add category to campaigns
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.campaign_categories(id);

-- Create campaign_tags table for better searchability
CREATE TABLE IF NOT EXISTS public.campaign_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, tag)
);

-- Create campaign_beneficiaries table
CREATE TABLE IF NOT EXISTS public.campaign_beneficiaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50),
    age INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add verification fields to campaigns
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_location ON public.campaigns(location_country, location_city);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON public.campaigns(category_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_deadline ON public.campaigns(deadline);
CREATE INDEX IF NOT EXISTS idx_campaigns_featured ON public.campaigns(featured_until) WHERE featured_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_deleted ON public.campaigns(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_media_campaign ON public.campaign_media(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_tags_tag ON public.campaign_tags(tag);
CREATE INDEX IF NOT EXISTS idx_campaign_tags_campaign ON public.campaign_tags(campaign_id);

-- Create function to validate campaign status transitions
CREATE OR REPLACE FUNCTION public.validate_campaign_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow certain status transitions
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        CASE OLD.status
            WHEN 'DRAFT' THEN
                IF NEW.status NOT IN ('PENDING_REVIEW', 'CANCELLED') THEN
                    RAISE EXCEPTION 'Invalid status transition from DRAFT to %', NEW.status;
                END IF;
            WHEN 'PENDING_REVIEW' THEN
                IF NEW.status NOT IN ('FUNDING', 'REJECTED', 'DRAFT') THEN
                    RAISE EXCEPTION 'Invalid status transition from PENDING_REVIEW to %', NEW.status;
                END IF;
            WHEN 'FUNDING' THEN
                IF NEW.status NOT IN ('FUNDED', 'COMPLETED', 'CANCELLED') THEN
                    RAISE EXCEPTION 'Invalid status transition from FUNDING to %', NEW.status;
                END IF;
            WHEN 'FUNDED' THEN
                IF NEW.status NOT IN ('COMPLETED', 'CANCELLED') THEN
                    RAISE EXCEPTION 'Invalid status transition from FUNDED to %', NEW.status;
                END IF;
            WHEN 'COMPLETED' THEN
                RAISE EXCEPTION 'Cannot change status from COMPLETED';
            WHEN 'REJECTED' THEN
                IF NEW.status NOT IN ('DRAFT') THEN
                    RAISE EXCEPTION 'Invalid status transition from REJECTED to %', NEW.status;
                END IF;
            WHEN 'CANCELLED' THEN
                RAISE EXCEPTION 'Cannot change status from CANCELLED';
        END CASE;
        
        -- Set status change timestamps
        IF NEW.status = 'FUNDING' AND OLD.status != 'FUNDING' THEN
            NEW.published_at = NOW();
        END IF;
        
        IF NEW.status = 'FUNDED' AND OLD.status != 'FUNDED' THEN
            NEW.funded_at = NOW();
        END IF;
        
        IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
            NEW.completed_at = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status validation
CREATE TRIGGER validate_campaign_status_change
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_campaign_status_transition();

-- Create function to calculate campaign progress percentage
CREATE OR REPLACE FUNCTION public.calculate_campaign_progress(campaign_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    progress DECIMAL;
BEGIN
    SELECT 
        CASE 
            WHEN goal_amount = 0 THEN 0
            ELSE ROUND((raised_amount / goal_amount) * 100, 2)
        END INTO progress
    FROM public.campaigns
    WHERE id = campaign_id;
    
    RETURN COALESCE(progress, 0);
END;
$$ LANGUAGE plpgsql;

-- Create function to check if user can create campaign
CREATE OR REPLACE FUNCTION public.can_user_create_campaign(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_verification user_verification_status;
    active_campaigns INTEGER;
BEGIN
    -- Check user verification status
    SELECT verification_status INTO user_verification
    FROM public.user_profiles
    WHERE id = user_id;
    
    -- User must be at least KYC basic verified
    IF user_verification IS NULL OR user_verification = 'unverified' OR user_verification = 'email_verified' THEN
        RETURN FALSE;
    END IF;
    
    -- Check number of active campaigns
    SELECT COUNT(*) INTO active_campaigns
    FROM public.campaigns
    WHERE recipient_id = user_id
    AND status IN ('DRAFT', 'PENDING_REVIEW', 'FUNDING')
    AND deleted_at IS NULL;
    
    -- Limit to 3 active campaigns per user
    IF active_campaigns >= 3 THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for new tables
ALTER TABLE public.campaign_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_beneficiaries ENABLE ROW LEVEL SECURITY;

-- Campaign media policies
CREATE POLICY "Campaign media viewable with campaign" 
    ON public.campaign_media FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = campaign_media.campaign_id 
        AND (campaigns.status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR campaigns.recipient_id = auth.uid())
    ));

CREATE POLICY "Campaign owners can manage media" 
    ON public.campaign_media FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = campaign_media.campaign_id 
        AND campaigns.recipient_id = auth.uid()
    ));

-- Categories are public
CREATE POLICY "Categories viewable by everyone" 
    ON public.campaign_categories FOR SELECT 
    USING (is_active = true);

-- Campaign tags policies
CREATE POLICY "Campaign tags viewable with campaign" 
    ON public.campaign_tags FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = campaign_tags.campaign_id 
        AND (campaigns.status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR campaigns.recipient_id = auth.uid())
    ));

CREATE POLICY "Campaign owners can manage tags" 
    ON public.campaign_tags FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = campaign_tags.campaign_id 
        AND campaigns.recipient_id = auth.uid()
    ));

-- Campaign beneficiaries policies
CREATE POLICY "Beneficiaries viewable with campaign" 
    ON public.campaign_beneficiaries FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = campaign_beneficiaries.campaign_id 
        AND (campaigns.status IN ('FUNDING', 'FUNDED', 'COMPLETED') OR campaigns.recipient_id = auth.uid())
    ));

CREATE POLICY "Campaign owners can manage beneficiaries" 
    ON public.campaign_beneficiaries FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = campaign_beneficiaries.campaign_id 
        AND campaigns.recipient_id = auth.uid()
    ));

-- Update updated_at triggers for new tables
CREATE TRIGGER update_campaign_media_updated_at BEFORE UPDATE ON public.campaign_media
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
