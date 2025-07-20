import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { 
  signInWithGoogle, 
  signInWithApple, 
  enrollMFA, 
  verifyMFA, 
  unenrollMFA,
  getUserRole,
  hasRole,
  isAdmin,
  hasPermission,
  authConfig
} from '@/lib/auth.config';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [mfaFactors, setMfaFactors] = useState([]);

  // Fetch user profile with role
  const fetchUserProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      setUserProfile(data);
      setUserRole(data?.role || 'donor');
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }, []);

  // Fetch MFA factors
  const fetchMFAFactors = useCallback(async () => {
    try {
      const { data: { factors }, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      setMfaFactors(factors || []);
      return factors;
    } catch (error) {
      console.error('Error fetching MFA factors:', error);
      return [];
    }
  }, []);

  const handleSession = useCallback(async (session) => {
    setSession(session);
    setUser(session?.user ?? null);
    
    if (session?.user) {
      await fetchUserProfile(session.user.id);
      await fetchMFAFactors();
    } else {
      setUserProfile(null);
      setUserRole(null);
      setMfaFactors([]);
    }
    
    setLoading(false);
  }, [fetchUserProfile, fetchMFAFactors]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      handleSession(session);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        handleSession(session);
        
        // Handle auth events
        if (event === 'SIGNED_IN') {
          // Track login
          await supabase
            .from('user_profiles')
            .update({ 
              last_login_at: new Date().toISOString(),
              login_count: supabase.sql`login_count + 1`
            })
            .eq('id', session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [handleSession]);

  // Enhanced sign up with role
  const signUp = useCallback(async (email, password, options = {}) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          ...options,
          data: {
            role: options.role || 'donor',
            ...options.data
          }
        }
      });

      if (authError) throw authError;

      // Create user profile
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            display_name: options.displayName || email.split('@')[0],
            country_iso: options.country || 'US',
            preferred_language: options.language || 'en',
            role: options.role || 'donor',
            phone_number: options.phoneNumber,
            date_of_birth: options.dateOfBirth
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
      }

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });

      return { error: null };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
      });
      return { error };
    }
  }, [toast]);

  // Standard sign in
  const signIn = useCallback(async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: error.message || "Something went wrong",
      });
      return { error };
    }
  }, [toast]);

  // Social sign in
  const signInWithProvider = useCallback(async (provider) => {
    try {
      let result;
      
      switch (provider) {
        case 'google':
          result = await signInWithGoogle();
          break;
        case 'apple':
          result = await signInWithApple();
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      if (result.error) throw result.error;

      return { error: null };
    } catch (error) {
      toast({
        variant: "destructive",
        title: `${provider} Sign in Failed`,
        description: error.message || "Something went wrong",
      });
      return { error };
    }
  }, [toast]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      return { error: null };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign out Failed",
        description: error.message || "Something went wrong",
      });
      return { error };
    }
  }, [toast]);

  // MFA enrollment
  const enrollInMFA = useCallback(async () => {
    try {
      const result = await enrollMFA();
      if (result.error) throw result.error;

      await fetchMFAFactors();
      
      toast({
        title: "MFA Setup",
        description: "Scan the QR code with your authenticator app",
      });

      return result;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "MFA Setup Failed",
        description: error.message || "Something went wrong",
      });
      return { data: null, error };
    }
  }, [toast, fetchMFAFactors]);

  // MFA verification
  const verifyMFACode = useCallback(async (code, factorId) => {
    try {
      const result = await verifyMFA(code, factorId);
      if (result.error) throw result.error;

      toast({
        title: "MFA Verified",
        description: "Multi-factor authentication successful",
      });

      return result;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "MFA Verification Failed",
        description: "Invalid code. Please try again.",
      });
      return { data: null, error };
    }
  }, [toast]);

  // Remove MFA
  const removeMFA = useCallback(async (factorId) => {
    try {
      const result = await unenrollMFA(factorId);
      if (result.error) throw result.error;

      await fetchMFAFactors();
      
      toast({
        title: "MFA Removed",
        description: "Multi-factor authentication has been disabled",
      });

      return result;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "MFA Removal Failed",
        description: error.message || "Something went wrong",
      });
      return { data: null, error };
    }
  }, [toast, fetchMFAFactors]);

  // Role and permission checks
  const checkRole = useCallback(async (requiredRole) => {
    if (!user) return false;
    return await hasRole(user.id, requiredRole);
  }, [user]);

  const checkIsAdmin = useCallback(async () => {
    if (!user) return false;
    return await isAdmin(user.id);
  }, [user]);

  const checkPermission = useCallback((permission) => {
    if (!userRole) return false;
    return hasPermission(userRole, permission);
  }, [userRole]);

  // Update user role (admin only)
  const updateUserRole = useCallback(async (userId, newRole) => {
    try {
      // Check if current user is admin
      const isCurrentUserAdmin = await checkIsAdmin();
      if (!isCurrentUserAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Role Updated",
        description: `User role updated to ${newRole}`,
      });

      return { error: null };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Role Update Failed",
        description: error.message || "Something went wrong",
      });
      return { error };
    }
  }, [checkIsAdmin, toast]);

  const value = useMemo(() => ({
    // Auth state
    user,
    session,
    loading,
    userRole,
    userProfile,
    mfaFactors,
    
    // Auth methods
    signUp,
    signIn,
    signInWithProvider,
    signOut,
    
    // MFA methods
    enrollInMFA,
    verifyMFACode,
    removeMFA,
    
    // Role methods
    checkRole,
    checkIsAdmin,
    checkPermission,
    updateUserRole,
    
    // Utility methods
    fetchUserProfile,
    fetchMFAFactors,
    
    // Config
    authConfig
  }), [
    user, 
    session, 
    loading, 
    userRole, 
    userProfile,
    mfaFactors,
    signUp, 
    signIn, 
    signInWithProvider,
    signOut,
    enrollInMFA,
    verifyMFACode,
    removeMFA,
    checkRole,
    checkIsAdmin,
    checkPermission,
    updateUserRole,
    fetchUserProfile,
    fetchMFAFactors
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
