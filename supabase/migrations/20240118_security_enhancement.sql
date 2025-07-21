-- Security Enhancement Tables Migration
-- Add security-related tables and enhance existing ones

-- Account locks table for tracking locked accounts
CREATE TABLE IF NOT EXISTS account_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    reason TEXT NOT NULL,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    unlocked_at TIMESTAMPTZ,
    unlocked_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_account_locks_email ON account_locks(email);
CREATE INDEX idx_account_locks_expires ON account_locks(expires_at);

-- Security logs table for audit trail
CREATE TABLE IF NOT EXISTS security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    data JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    request_id TEXT
);

CREATE INDEX idx_security_logs_user ON security_logs(user_id);
CREATE INDEX idx_security_logs_event ON security_logs(event_type);
CREATE INDEX idx_security_logs_timestamp ON security_logs(timestamp);
CREATE INDEX idx_security_logs_ip ON security_logs(ip_address);

-- User devices table for tracking known devices
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    device_name TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    last_used TIMESTAMPTZ DEFAULT NOW(),
    trusted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_fingerprint)
);

CREATE INDEX idx_user_devices_user ON user_devices(user_id);
CREATE INDEX idx_user_devices_fingerprint ON user_devices(device_fingerprint);

-- Failed login attempts table
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address INET NOT NULL,
    attempt_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_message TEXT
);

CREATE INDEX idx_failed_login_email ON failed_login_attempts(email);
CREATE INDEX idx_failed_login_ip ON failed_login_attempts(ip_address);
CREATE INDEX idx_failed_login_time ON failed_login_attempts(attempt_time);

-- Session management table
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);

-- File upload security table
CREATE TABLE IF NOT EXISTS uploaded_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    checksum TEXT NOT NULL,
    thumbnail_url TEXT,
    scan_status TEXT DEFAULT 'pending',
    scan_result JSONB,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_uploaded_files_user ON uploaded_files(user_id);
CREATE INDEX idx_uploaded_files_campaign ON uploaded_files(campaign_id);
CREATE INDEX idx_uploaded_files_checksum ON uploaded_files(checksum);

-- Upload logs for tracking file operations
CREATE TABLE IF NOT EXISTS upload_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    campaign_id UUID REFERENCES campaigns(id),
    file_id UUID REFERENCES uploaded_files(id),
    filename TEXT,
    action TEXT NOT NULL,
    error TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET
);

CREATE INDEX idx_upload_logs_user ON upload_logs(user_id);
CREATE INDEX idx_upload_logs_action ON upload_logs(action);
CREATE INDEX idx_upload_logs_timestamp ON upload_logs(timestamp);

-- API rate limiting table
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL, -- Could be IP, user ID, API key
    endpoint TEXT NOT NULL,
    requests_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    window_end TIMESTAMPTZ NOT NULL,
    blocked_until TIMESTAMPTZ,
    UNIQUE(identifier, endpoint, window_start)
);

CREATE INDEX idx_rate_limits_identifier ON api_rate_limits(identifier);
CREATE INDEX idx_rate_limits_window ON api_rate_limits(window_end);

-- Suspicious activity tracking
CREATE TABLE IF NOT EXISTS suspicious_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    activity_type TEXT NOT NULL,
    details JSONB NOT NULL,
    risk_score INTEGER DEFAULT 0,
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suspicious_user ON suspicious_activities(user_id);
CREATE INDEX idx_suspicious_type ON suspicious_activities(activity_type);
CREATE INDEX idx_suspicious_resolved ON suspicious_activities(resolved);

-- Enhanced user_profiles with security fields
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS backup_codes TEXT[],
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS password_history TEXT[], -- Hashed previous passwords
ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS account_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lock_reason TEXT,
ADD COLUMN IF NOT EXISTS failed_login_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS security_questions JSONB,
ADD COLUMN IF NOT EXISTS trusted_ips INET[],
ADD COLUMN IF NOT EXISTS login_notification_enabled BOOLEAN DEFAULT true;

-- Add security indexes to user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_2fa ON user_profiles(two_factor_enabled);
CREATE INDEX IF NOT EXISTS idx_user_profiles_locked ON user_profiles(account_locked);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_token ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_expires ON password_reset_tokens(expires_at);

-- CSRF tokens table
CREATE TABLE IF NOT EXISTS csrf_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL UNIQUE,
    session_id TEXT,
    user_id UUID REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_csrf_token ON csrf_tokens(token_hash);
CREATE INDEX idx_csrf_session ON csrf_tokens(session_id);
CREATE INDEX idx_csrf_expires ON csrf_tokens(expires_at);

-- Row Level Security Policies

-- Account locks RLS
ALTER TABLE account_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all locks" ON account_locks
    FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view their own locks" ON account_locks
    FOR SELECT
    TO authenticated
    USING (email = auth.jwt() ->> 'email');

-- Security logs RLS
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all logs" ON security_logs
    FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view their own logs" ON security_logs
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- User devices RLS
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own devices" ON user_devices
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

-- Uploaded files RLS
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own files" ON uploaded_files
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can view campaign files" ON uploaded_files
    FOR SELECT
    TO authenticated
    USING (
        campaign_id IN (
            SELECT id FROM campaigns 
            WHERE recipient_id = auth.uid() 
            OR auth.uid() IN (
                SELECT donor_id FROM donations WHERE campaign_id = campaigns.id
            )
        )
    );

-- Functions for security operations

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM account_locks
        WHERE email = p_email
        AND expires_at > NOW()
        AND unlocked_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to lock account
CREATE OR REPLACE FUNCTION lock_account(
    p_email TEXT,
    p_reason TEXT,
    p_duration INTERVAL DEFAULT '30 minutes'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO account_locks (email, reason, expires_at)
    VALUES (p_email, p_reason, NOW() + p_duration);
    
    UPDATE user_profiles
    SET account_locked = true, lock_reason = p_reason
    WHERE email = p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log security event
CREATE OR REPLACE FUNCTION log_security_event(
    p_event_type TEXT,
    p_user_id UUID DEFAULT NULL,
    p_data JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO security_logs (event_type, user_id, data, ip_address, user_agent)
    VALUES (p_event_type, p_user_id, p_data, p_ip_address, p_user_agent);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old security data
CREATE OR REPLACE FUNCTION cleanup_security_data()
RETURNS VOID AS $$
BEGIN
    -- Delete old failed login attempts (older than 7 days)
    DELETE FROM failed_login_attempts
    WHERE attempt_time < NOW() - INTERVAL '7 days';
    
    -- Delete old security logs (older than 90 days)
    DELETE FROM security_logs
    WHERE timestamp < NOW() - INTERVAL '90 days'
    AND event_type NOT IN ('account_locked', 'suspicious_activity_detected', 'data_breach_attempt');
    
    -- Delete expired sessions
    DELETE FROM user_sessions
    WHERE expires_at < NOW();
    
    -- Delete old CSRF tokens
    DELETE FROM csrf_tokens
    WHERE expires_at < NOW() - INTERVAL '1 day';
    
    -- Delete old password reset tokens
    DELETE FROM password_reset_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup function to run daily
SELECT cron.schedule(
    'cleanup-security-data',
    '0 3 * * *', -- Run at 3 AM daily
    'SELECT cleanup_security_data();'
);