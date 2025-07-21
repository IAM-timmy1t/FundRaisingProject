// GDPR Service - Handles all GDPR-related operations
import { supabase } from '@/lib/supabase';

export class GDPRService {
  // Data Export - Right to Access
  static async exportUserData(userId) {
    try {
      // Gather all user data from different tables
      const [profile, campaigns, donations, consents, activities] = await Promise.all([
        // User profile
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        
        // User's campaigns
        supabase
          .from('campaigns')
          .select('*')
          .eq('created_by', userId),
        
        // User's donations
        supabase
          .from('donations')
          .select('*')
          .eq('donor_id', userId),
        
        // User's consent records
        supabase
          .from('user_consent')
          .select('*')
          .eq('user_id', userId),
        
        // User's activity logs
        supabase
          .from('audit_logs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1000)
      ]);

      // Check for errors
      const errors = [profile, campaigns, donations, consents, activities]
        .filter(result => result.error)
        .map(result => result.error);
      
      if (errors.length > 0) {
        throw new Error('Failed to export some data');
      }

      // Compile the data
      return {
        exportDate: new Date().toISOString(),
        userData: {
          profile: profile.data,
          campaigns: campaigns.data || [],
          donations: donations.data || [],
          consents: consents.data || [],
          recentActivity: activities.data || []
        }
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  // Data Deletion - Right to Erasure
  static async deleteUserData(userId, confirmEmail) {
    try {
      // Verify user email matches
      const { data: user } = await supabase.auth.getUser();
      if (user?.user?.email !== confirmEmail) {
        throw new Error('Email confirmation does not match');
      }

      // Anonymize donations (keep for financial records but remove PII)
      await supabase
        .from('donations')
        .update({ 
          donor_id: null,
          donor_email: 'deleted@user.com',
          donor_name: 'Deleted User'
        })
        .eq('donor_id', userId);

      // Delete user campaigns
      await supabase
        .from('campaigns')
        .delete()
        .eq('created_by', userId);

      // Delete user profile
      await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      // Delete consent records
      await supabase
        .from('user_consent')
        .delete()
        .eq('user_id', userId);

      // Delete auth user
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  }

  // Consent Management
  static async updateConsent(userId, consentType, granted) {
    try {
      const { data, error } = await supabase
        .from('user_consent')
        .upsert({
          user_id: userId,
          consent_type: consentType,
          granted: granted,
          ip_address: await this.getUserIP(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,consent_type'
        });

      if (error) throw error;

      // Log consent change
      await this.logAuditEvent(userId, 'consent_updated', {
        consentType,
        granted,
        timestamp: new Date().toISOString()
      });

      return data;
    } catch (error) {
      console.error('Error updating consent:', error);
      throw error;
    }
  }

  // Get user consents
  static async getUserConsents(userId) {
    try {
      const { data, error } = await supabase
        .from('user_consent')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching consents:', error);
      throw error;
    }
  }

  // Audit logging for GDPR compliance
  static async logAuditEvent(userId, eventType, eventData) {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          event_type: eventType,
          event_data: eventData,
          ip_address: await this.getUserIP(),
          user_agent: navigator.userAgent,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }

  // Helper to get user IP (would need server-side implementation)
  static async getUserIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }
}

export default GDPRService;
