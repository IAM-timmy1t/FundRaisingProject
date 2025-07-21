-- GDPR Compliance Tables Migration
-- This migration adds necessary tables for GDPR compliance

-- User Consent Tracking Table
CREATE TABLE IF NOT EXISTS user_consent (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL CHECK (consent_type IN ('marketing', 'analytics', 'preferences', 'communications')),
    granted BOOLEAN NOT NULL DEFAULT false,
    consent_version TEXT NOT NULL DEFAULT '1.0',
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, consent_type)
);

-- Audit Logs Table for GDPR Compliance
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Processing Activities Record (Article 30 GDPR)
CREATE TABLE IF NOT EXISTS data_processing_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    legal_basis TEXT NOT NULL,
    data_categories TEXT[],
    data_subjects TEXT[],
    recipients TEXT[],
    retention_period TEXT,
    security_measures TEXT[],
    third_country_transfers BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Retention Policies
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    data_type TEXT NOT NULL UNIQUE,
    retention_days INTEGER NOT NULL,
    description TEXT,
    legal_requirement BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Privacy Settings per User
CREATE TABLE IF NOT EXISTS user_privacy_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    show_donation_history BOOLEAN DEFAULT true,
    show_campaign_history BOOLEAN DEFAULT true,
    allow_public_profile BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_consent_user_id ON user_consent(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- RLS Policies
ALTER TABLE user_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Users can only view and update their own consent
CREATE POLICY "Users can view own consent" ON user_consent
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own consent" ON user_consent
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent" ON user_consent
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only view their own privacy settings
CREATE POLICY "Users can view own privacy settings" ON user_privacy_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own privacy settings" ON user_privacy_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own privacy settings" ON user_privacy_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Insert default data retention policies
INSERT INTO data_retention_policies (data_type, retention_days, description, legal_requirement) VALUES
    ('donations', 2555, 'Financial records must be kept for 7 years', true),
    ('user_profiles', 1095, 'User profiles kept for 3 years after last activity', false),
    ('campaigns', 1825, 'Campaign data kept for 5 years', false),
    ('audit_logs', 365, 'Audit logs kept for 1 year', true),
    ('notifications', 90, 'Notifications kept for 90 days', false),
    ('sessions', 30, 'Session data kept for 30 days', false)
ON CONFLICT (data_type) DO NOTHING;

-- Function to automatically delete old data based on retention policies
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
DECLARE
    policy RECORD;
BEGIN
    FOR policy IN SELECT * FROM data_retention_policies LOOP
        CASE policy.data_type
            WHEN 'notifications' THEN
                DELETE FROM notifications 
                WHERE created_at < NOW() - INTERVAL '1 day' * policy.retention_days;
            WHEN 'audit_logs' THEN
                DELETE FROM audit_logs 
                WHERE created_at < NOW() - INTERVAL '1 day' * policy.retention_days;
            WHEN 'sessions' THEN
                -- Handle session cleanup if applicable
                NULL;
        END CASE;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_consent_updated_at BEFORE UPDATE
    ON user_consent FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_privacy_settings_updated_at BEFORE UPDATE
    ON user_privacy_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_data_processing_activities_updated_at BEFORE UPDATE
    ON data_processing_activities FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
