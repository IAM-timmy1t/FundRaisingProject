// User Profile Service
// Task #6: User Profile Enhancement

import { supabase } from './customSupabaseClient';

/**
 * User Profile Service
 * Handles all user profile operations including trust scores,
 * verification status, and crowdfunding statistics
 */
export const userProfileService = {
  /**
   * Get complete user profile with all fields
   */
  async getProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching profile:', error);
      return { data: null, error };
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { data: null, error };
    }
  },

  /**
   * Get user's verification status
   */
  async getVerificationStatus(userId) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('verification_status, kyc_data')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching verification status:', error);
      return { data: null, error };
    }
  },

  /**
   * Update verification status
   */
  async updateVerificationStatus(userId, status, kycData = null) {
    try {
      const updates = {
        verification_status: status
      };

      if (kycData) {
        updates.kyc_data = kycData;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating verification status:', error);
      return { data: null, error };
    }
  },

  /**
   * Get user's trust score and tier
   */
  async getTrustScore(userId) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('trust_score, trust_tier')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching trust score:', error);
      return { data: null, error };
    }
  },

  /**
   * Get user's crowdfunding statistics
   */
  async getCrowdfundingStats(userId) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          total_donated,
          total_received,
          campaigns_created,
          campaigns_supported
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching crowdfunding stats:', error);
      return { data: null, error };
    }
  },

  /**
   * Get user's trust score history
   */
  async getTrustScoreHistory(userId, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('trust_score_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching trust score history:', error);
      return { data: null, error };
    }
  },

  /**
   * Calculate profile completion percentage
   */
  calculateProfileCompletion(profile) {
    const requiredFields = [
      'display_name',
      'country_iso',
      'date_of_birth',
      'phone_number'
    ];

    const optionalFields = [
      'preferred_language'
    ];

    let completedRequired = 0;
    let completedOptional = 0;

    requiredFields.forEach(field => {
      if (profile[field]) completedRequired++;
    });

    optionalFields.forEach(field => {
      if (profile[field]) completedOptional++;
    });

    // Required fields contribute 80%, optional 20%
    const requiredPercentage = (completedRequired / requiredFields.length) * 80;
    const optionalPercentage = (completedOptional / optionalFields.length) * 20;

    return Math.round(requiredPercentage + optionalPercentage);
  },

  /**
   * Get profile with additional computed fields
   */
  async getEnhancedProfile(userId) {
    try {
      const { data: profile, error } = await this.getProfile(userId);
      if (error) throw error;

      // Calculate profile completion
      profile.profileCompletion = this.calculateProfileCompletion(profile);

      // Determine if user can create campaigns (based on verification)
      profile.canCreateCampaign = ['kyc_basic', 'kyc_advanced', 'kyc_full'].includes(
        profile.verification_status
      );

      // Format display fields
      profile.formattedTrustScore = profile.trust_score?.toFixed(1) || '50.0';
      profile.trustTierDisplay = this.getTrustTierDisplay(profile.trust_tier);

      return { data: profile, error: null };
    } catch (error) {
      console.error('Error fetching enhanced profile:', error);
      return { data: null, error };
    }
  },

  /**
   * Get trust tier display information
   */
  getTrustTierDisplay(tier) {
    const tiers = {
      NEW: {
        label: 'New Member',
        color: 'gray',
        description: 'Just started their journey'
      },
      RISING: {
        label: 'Rising Star',
        color: 'blue',
        description: 'Building trust through actions'
      },
      STEADY: {
        label: 'Steady Contributor',
        color: 'green',
        description: 'Consistent and reliable'
      },
      TRUSTED: {
        label: 'Trusted Member',
        color: 'purple',
        description: 'Proven track record'
      },
      STAR: {
        label: 'Star Contributor',
        color: 'gold',
        description: 'Exceptional trust and impact'
      }
    };

    return tiers[tier] || tiers.NEW;
  },

  /**
   * Update user preferences
   */
  async updatePreferences(userId, preferences) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          preferred_language: preferences.language,
          metadata: {
            preferences: {
              emailNotifications: preferences.emailNotifications,
              pushNotifications: preferences.pushNotifications,
              publicProfile: preferences.publicProfile,
              showTrustScore: preferences.showTrustScore
            }
          }
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating preferences:', error);
      return { data: null, error };
    }
  }
};

export default userProfileService;
