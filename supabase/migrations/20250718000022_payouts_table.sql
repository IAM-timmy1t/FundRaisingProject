-- Create payouts table for financial tracking
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES auth.users(id),
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'GBP',
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    stripe_payout_id VARCHAR(255),
    bank_reference VARCHAR(255),
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_payouts_campaign ON payouts(campaign_id);
CREATE INDEX idx_payouts_recipient ON payouts(recipient_id);
CREATE INDEX idx_payouts_status ON payouts(status);

-- Enable RLS
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payouts" ON payouts
    FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY "Only system can create payouts" ON payouts
    FOR INSERT WITH CHECK (false);

CREATE POLICY "Only system can update payouts" ON payouts
    FOR UPDATE USING (false);
