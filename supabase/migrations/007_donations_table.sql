-- Migration: Create donations table and related functionality
-- Description: Implements donation tracking for Task #12 - Donation Flow Implementation

-- Create donations table
CREATE TABLE public.donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE RESTRICT NOT NULL,
    donor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Donation details
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Donor information (for guest donations)
    donor_name VARCHAR(100),
    donor_email VARCHAR(255),
    is_anonymous BOOLEAN DEFAULT FALSE,
    message TEXT,
    
    -- Payment information
    payment_intent_id VARCHAR(255) UNIQUE,
    payment_method_type VARCHAR(50),
    payment_status payment_status DEFAULT 'pending',
    payment_processor VARCHAR(50) DEFAULT 'stripe',
    
    -- Processing fees
    processing_fee DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) GENERATED ALWAYS AS (amount - processing_fee) STORED,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT check_donor_info CHECK (
        -- Either have a donor_id or both name and email for guest donations
        donor_id IS NOT NULL OR (donor_name IS NOT NULL AND donor_email IS NOT NULL)
    )
);

-- Create indexes for performance
CREATE INDEX idx_donations_campaign_id ON public.donations(campaign_id);
CREATE INDEX idx_donations_donor_id ON public.donations(donor_id) WHERE donor_id IS NOT NULL;
CREATE INDEX idx_donations_payment_status ON public.donations(payment_status);
CREATE INDEX idx_donations_created_at ON public.donations(created_at DESC);
CREATE INDEX idx_donations_donor_email ON public.donations(donor_email) WHERE donor_email IS NOT NULL;

-- Create donation receipts table
CREATE TABLE public.donation_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donation_id UUID REFERENCES public.donations(id) ON DELETE CASCADE NOT NULL,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    tax_deductible_amount DECIMAL(12,2),
    receipt_url TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Create function to generate receipt number
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
    current_year INTEGER;
    receipt_count INTEGER;
    receipt_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW());
    
    -- Count existing receipts for this year
    SELECT COUNT(*) + 1 INTO receipt_count
    FROM public.donation_receipts
    WHERE EXTRACT(YEAR FROM generated_at) = current_year;
    
    -- Format: BH-YYYY-000001
    receipt_number := 'BH-' || current_year || '-' || LPAD(receipt_count::TEXT, 6, '0');
    
    RETURN receipt_number;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment campaign raised amount
CREATE OR REPLACE FUNCTION public.increment_campaign_raised_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Only increment when payment is completed
    IF NEW.payment_status = 'completed' AND 
       (OLD IS NULL OR OLD.payment_status != 'completed') THEN
        
        UPDATE public.campaigns
        SET 
            raised_amount = raised_amount + NEW.amount,
            -- Update status if goal is reached
            status = CASE 
                WHEN (raised_amount + NEW.amount) >= goal_amount AND status = 'FUNDING' THEN 'FUNDED'
                ELSE status
            END,
            funded_at = CASE
                WHEN (raised_amount + NEW.amount) >= goal_amount AND status = 'FUNDING' AND funded_at IS NULL THEN NOW()
                ELSE funded_at
            END
        WHERE id = NEW.campaign_id;
        
        -- Update donor statistics if not anonymous
        IF NEW.donor_id IS NOT NULL THEN
            UPDATE public.user_profiles
            SET 
                total_donated = total_donated + NEW.amount,
                campaigns_supported = campaigns_supported + 1
            WHERE id = NEW.donor_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for incrementing campaign raised amount
CREATE TRIGGER increment_campaign_amount_on_donation
    AFTER INSERT OR UPDATE ON public.donations
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_campaign_raised_amount();

-- Create function to handle donation refunds
CREATE OR REPLACE FUNCTION public.process_donation_refund(
    donation_id UUID,
    refund_amount DECIMAL(12,2) DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_donation RECORD;
    v_refund_amount DECIMAL(12,2);
BEGIN
    -- Get donation details
    SELECT * INTO v_donation
    FROM public.donations
    WHERE id = donation_id AND payment_status = 'completed';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Donation not found or not completed';
    END IF;
    
    -- Set refund amount
    v_refund_amount := COALESCE(refund_amount, v_donation.amount);
    
    IF v_refund_amount > v_donation.amount THEN
        RAISE EXCEPTION 'Refund amount cannot exceed donation amount';
    END IF;
    
    -- Update donation status
    UPDATE public.donations
    SET 
        payment_status = 'refunded',
        refunded_at = NOW(),
        metadata = metadata || jsonb_build_object('refund_amount', v_refund_amount)
    WHERE id = donation_id;
    
    -- Decrement campaign raised amount
    UPDATE public.campaigns
    SET 
        raised_amount = GREATEST(0, raised_amount - v_refund_amount),
        status = CASE 
            WHEN status = 'FUNDED' AND (raised_amount - v_refund_amount) < goal_amount THEN 'FUNDING'
            ELSE status
        END
    WHERE id = v_donation.campaign_id;
    
    -- Update donor statistics
    IF v_donation.donor_id IS NOT NULL THEN
        UPDATE public.user_profiles
        SET 
            total_donated = GREATEST(0, total_donated - v_refund_amount)
        WHERE id = v_donation.donor_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for donation analytics
CREATE OR REPLACE VIEW public.donation_analytics AS
SELECT 
    d.campaign_id,
    c.title as campaign_title,
    c.recipient_id,
    COUNT(DISTINCT d.id) as total_donations,
    COUNT(DISTINCT CASE WHEN d.donor_id IS NOT NULL THEN d.donor_id ELSE d.donor_email END) as unique_donors,
    SUM(d.amount) FILTER (WHERE d.payment_status = 'completed') as total_raised,
    AVG(d.amount) FILTER (WHERE d.payment_status = 'completed') as average_donation,
    MAX(d.amount) FILTER (WHERE d.payment_status = 'completed') as largest_donation,
    MIN(d.amount) FILTER (WHERE d.payment_status = 'completed') as smallest_donation,
    COUNT(*) FILTER (WHERE d.is_anonymous = true) as anonymous_donations,
    COUNT(*) FILTER (WHERE d.payment_status = 'failed') as failed_donations,
    COUNT(*) FILTER (WHERE d.payment_status = 'refunded') as refunded_donations
FROM public.donations d
JOIN public.campaigns c ON d.campaign_id = c.id
GROUP BY d.campaign_id, c.title, c.recipient_id;

-- Row Level Security Policies

-- Enable RLS on donations table
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_receipts ENABLE ROW LEVEL SECURITY;

-- Donations policies
CREATE POLICY "Donations viewable by donor"
    ON public.donations FOR SELECT
    USING (
        auth.uid() = donor_id OR 
        (donor_email IS NOT NULL AND donor_email = auth.jwt()->>'email')
    );

CREATE POLICY "Donations viewable by campaign owner"
    ON public.donations FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = donations.campaign_id 
        AND campaigns.recipient_id = auth.uid()
    ));

CREATE POLICY "Public can view non-anonymous completed donations"
    ON public.donations FOR SELECT
    USING (
        payment_status = 'completed' 
        AND is_anonymous = false
    );

CREATE POLICY "Service role can manage all donations"
    ON public.donations FOR ALL
    USING (auth.role() = 'service_role');

-- Donation receipts policies
CREATE POLICY "Receipts viewable by donation owner"
    ON public.donation_receipts FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.donations
        WHERE donations.id = donation_receipts.donation_id
        AND (donations.donor_id = auth.uid() OR donations.donor_email = auth.jwt()->>'email')
    ));

CREATE POLICY "Service role can manage receipts"
    ON public.donation_receipts FOR ALL
    USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT SELECT ON public.donation_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_donation_refund TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_receipt_number TO service_role;
