-- Migration: Add user roles and authentication enhancements
-- Task #5: Enhanced Authentication System

-- Create user role enum
CREATE TYPE user_role AS ENUM ('donor', 'recipient', 'admin', 'superadmin');

-- Add role column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN role user_role DEFAULT 'donor' NOT NULL;

-- Add MFA and social auth fields
ALTER TABLE public.user_profiles
ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN mfa_secret TEXT,
ADD COLUMN social_providers JSONB DEFAULT '[]',
ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN login_count INTEGER DEFAULT 0;

-- Create index for role-based queries
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);

-- Create admin users table for additional admin metadata
CREATE TABLE public.admin_users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    permissions JSONB DEFAULT '{}',
    admin_level INTEGER DEFAULT 1 CHECK (admin_level >= 1 AND admin_level <= 5),
    department VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, required_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = user_id AND role = required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin or superadmin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = user_id AND role IN ('admin', 'superadmin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role AS $$
DECLARE
    user_role_value user_role;
BEGIN
    SELECT role INTO user_role_value
    FROM public.user_profiles
    WHERE id = user_id;
    
    RETURN user_role_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to include role-based access
-- Example: Only admins can view all user profiles
ALTER POLICY "Users can view their own profile" ON public.user_profiles
    USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- Create trigger to update login tracking
CREATE OR REPLACE FUNCTION public.track_user_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_profiles
    SET last_login_at = NOW(),
        login_count = login_count + 1
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger would need to be attached to auth events
-- which is typically done through Supabase Auth Hooks

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated;
