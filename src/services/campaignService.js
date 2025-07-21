import { supabase } from '@/lib/customSupabaseClient';

export const campaignService = {
  /**
   * Get campaigns for a specific user with donation metrics
   */
  async getUserCampaigns(userId) {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          donations!campaign_id (
            amount,
            donor_id,
            created_at
          )
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Process campaigns to include metrics
      const processedCampaigns = data.map(campaign => {
        const donations = campaign.donations || [];
        const totalRaised = donations.reduce((sum, d) => sum + d.amount, 0);
        const uniqueDonors = new Set(donations.map(d => d.donor_id)).size;
        const lastDonation = donations.length > 0 
          ? Math.max(...donations.map(d => new Date(d.created_at)))
          : null;

        return {
          ...campaign,
          current_amount: totalRaised,
          donor_count: uniqueDonors,
          donation_count: donations.length,
          last_donation_date: lastDonation
        };
      });

      return { data: processedCampaigns, error: null };
    } catch (error) {
      console.error('Error fetching user campaigns:', error);
      return { data: null, error };
    }
  },

  /**
   * Get campaign statistics for a user
   */
  async getUserCampaignStats(userId) {
    try {
      const { data: campaigns, error } = await this.getUserCampaigns(userId);
      
      if (error) throw error;

      const stats = {
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter(c => c.status === 'active' || c.status === 'approved').length,
        completedCampaigns: campaigns.filter(c => c.status === 'completed').length,
        totalRaised: campaigns.reduce((sum, c) => sum + c.current_amount, 0),
        totalGoal: campaigns.reduce((sum, c) => sum + c.goal_amount, 0),
        averageCompletion: campaigns.length > 0 
          ? campaigns.reduce((sum, c) => sum + (c.current_amount / c.goal_amount * 100), 0) / campaigns.length 
          : 0
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error calculating campaign stats:', error);
      return { data: null, error };
    }
  },

  /**
   * Get a single campaign by ID
   */
  async getCampaign(campaignId) {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          user_profiles!campaigns_created_by_fkey (
            full_name,
            avatar_url,
            trust_score,
            trust_tier
          ),
          donations!campaign_id (
            amount,
            donor_id,
            created_at
          ),
          campaign_updates!campaign_id (
            id,
            title,
            content,
            update_type,
            created_at
          )
        `)
        .eq('id', campaignId)
        .single();

      if (error) throw error;

      // Process campaign data
      const donations = data.donations || [];
      const processedCampaign = {
        ...data,
        current_amount: donations.reduce((sum, d) => sum + d.amount, 0),
        donor_count: new Set(donations.map(d => d.donor_id)).size,
        donation_count: donations.length
      };

      return { data: processedCampaign, error: null };
    } catch (error) {
      console.error('Error fetching campaign:', error);
      return { data: null, error };
    }
  },

  /**
   * Create a new campaign
   */
  async createCampaign(campaignData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          ...campaignData,
          created_by: user.id,
          status: 'pending' // Pending moderation
        })
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error creating campaign:', error);
      return { data: null, error };
    }
  },

  /**
   * Update an existing campaign
   */
  async updateCampaign(campaignId, updates) {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', campaignId)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error updating campaign:', error);
      return { data: null, error };
    }
  },

  /**
   * Get campaigns that need updates
   */
  async getCampaignsNeedingUpdates(userId, daysThreshold = 7) {
    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          id,
          title,
          created_at,
          campaign_updates!campaign_id (
            created_at
          )
        `)
        .eq('created_by', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter campaigns that haven't been updated recently
      const campaignsNeedingUpdates = data.filter(campaign => {
        const updates = campaign.campaign_updates || [];
        if (updates.length === 0) {
          // No updates ever posted
          return new Date(campaign.created_at) < thresholdDate;
        }
        
        // Check last update date
        const lastUpdate = updates.reduce((latest, update) => {
          const updateDate = new Date(update.created_at);
          return updateDate > latest ? updateDate : latest;
        }, new Date(0));

        return lastUpdate < thresholdDate;
      });

      return { data: campaignsNeedingUpdates, error: null };
    } catch (error) {
      console.error('Error fetching campaigns needing updates:', error);
      return { data: null, error };
    }
  }
};

export default campaignService;