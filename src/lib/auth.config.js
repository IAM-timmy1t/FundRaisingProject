// Enhanced Authentication Configuration
// Task #5: Enhanced Authentication System

import { supabase } from './customSupabaseClient';

// Auth configuration with social providers and MFA
export const authConfig = {
  // Social authentication providers
  socialProviders: {
    google: {
      enabled: import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true',
      scopes: ['email', 'profile'],
      redirectTo: `${import.meta.env.VITE_APP_URL}/auth/callback`
    },
    apple: {
      enabled: import.meta.env.VITE_ENABLE_APPLE_AUTH === 'true',
      scopes: ['email', 'name'],
      redirectTo: `${import.meta.env.VITE_APP_URL}/auth/callback`
    }
  },

  // MFA settings
  mfa: {
    enabled: import.meta.env.VITE_ENABLE_MFA === 'true',
    factorTypes: ['totp'], // Time-based One-Time Password
    appName: 'Blessed-Horizon'
  },

  // User roles
  roles: {
    DONOR: 'donor',
    RECIPIENT: 'recipient',
    ADMIN: 'admin',
    SUPERADMIN: 'superadmin'
  },

  // Role permissions
  permissions: {
    donor: [
      'view_campaigns',
      'donate',
      'view_own_donations',
      'message_recipients'
    ],
    recipient: [
      'view_campaigns',
      'create_campaign',
      'edit_own_campaign',
      'post_updates',
      'view_donations',
      'message_donors'
    ],
    admin: [
      'view_all_campaigns',
      'moderate_campaigns',
      'view_all_users',
      'view_all_donations',
      'send_notifications',
      'view_analytics'
    ],
    superadmin: [
      'all_permissions',
      'manage_admins',
      'system_settings',
      'database_management'
    ]
  }
};

// Social authentication functions
export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: authConfig.socialProviders.google.redirectTo,
        scopes: authConfig.socialProviders.google.scopes.join(' ')
      }
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Google sign-in error:', error);
    return { data: null, error };
  }
};

export const signInWithApple = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: authConfig.socialProviders.apple.redirectTo,
        scopes: authConfig.socialProviders.apple.scopes.join(' ')
      }
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Apple sign-in error:', error);
    return { data: null, error };
  }
};

// MFA functions
export const enrollMFA = async () => {
  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: authConfig.mfa.appName
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('MFA enrollment error:', error);
    return { data: null, error };
  }
};

export const verifyMFA = async (code, factorId) => {
  try {
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      code
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('MFA verification error:', error);
    return { data: null, error };
  }
};

export const unenrollMFA = async (factorId) => {
  try {
    const { data, error } = await supabase.auth.mfa.unenroll({
      factorId
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('MFA unenrollment error:', error);
    return { data: null, error };
  }
};

// Role management functions
export const getUserRole = async (userId) => {
  try {
    const { data, error } = await supabase
      .rpc('get_user_role', { user_id: userId });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get user role error:', error);
    return null;
  }
};

export const hasRole = async (userId, requiredRole) => {
  try {
    const { data, error } = await supabase
      .rpc('has_role', { 
        user_id: userId, 
        required_role: requiredRole 
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Check role error:', error);
    return false;
  }
};

export const isAdmin = async (userId) => {
  try {
    const { data, error } = await supabase
      .rpc('is_admin', { user_id: userId });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Check admin error:', error);
    return false;
  }
};

// Helper to check permissions
export const hasPermission = (userRole, permission) => {
  const rolePermissions = authConfig.permissions[userRole] || [];
  
  // Superadmins have all permissions
  if (userRole === authConfig.roles.SUPERADMIN) {
    return true;
  }
  
  return rolePermissions.includes(permission);
};

export default authConfig;
