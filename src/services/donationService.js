import { supabase } from '@/lib/customSupabaseClient';

/**
 * Service for handling donation-related operations
 */
export const donationService = {
  /**
   * Get all donations made by a specific user
   */
  async getUserDonations(userId, options = {}) {
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = options;
    
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('donations')
        .select(`
          *,
          campaign:campaigns!inner(
            id,
            title,
            need_type,
            campaign_type,
            goal_amount,
            raised_amount,
            currency,
            status,
            recipient:user_profiles!campaigns_recipient_id_fkey(
              id,
              full_name,
              avatar_url
            )
          )
        `, { count: 'exact' })
        .eq('donor_id', userId)
        .eq('payment_status', 'completed')
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) throw error;

      return {
        donations: data || [],
        totalCount: count || 0,
        currentPage: page,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      console.error('Error fetching user donations:', error);
      throw error;
    }
  },

  /**
   * Get donation statistics for a user
   */
  async getUserDonationStats(userId) {
    try {
      // Get total donations and amount
      const { data: stats, error: statsError } = await supabase
        .from('donations')
        .select('amount')
        .eq('donor_id', userId)
        .eq('payment_status', 'completed');

      if (statsError) throw statsError;

      // Get campaigns supported count
      const { data: campaigns, error: campaignsError } = await supabase
        .from('donations')
        .select('campaign_id')
        .eq('donor_id', userId)
        .eq('payment_status', 'completed');

      if (campaignsError) throw campaignsError;

      const uniqueCampaigns = [...new Set(campaigns?.map(d => d.campaign_id) || [])];
      const totalAmount = stats?.reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;

      return {
        totalDonations: stats?.length || 0,
        totalAmount: totalAmount,
        campaignsSupported: uniqueCampaigns.length,
        averageDonation: stats?.length > 0 ? totalAmount / stats.length : 0
      };
    } catch (error) {
      console.error('Error fetching donation statistics:', error);
      throw error;
    }
  },

  /**
   * Get recent campaign updates from campaigns the user has donated to
   */
  async getDonorCampaignUpdates(userId, limit = 10) {
    try {
      // First, get campaigns the user has donated to
      const { data: donatedCampaigns, error: campaignsError } = await supabase
        .from('donations')
        .select('campaign_id')
        .eq('donor_id', userId)
        .eq('payment_status', 'completed');

      if (campaignsError) throw campaignsError;

      const campaignIds = [...new Set(donatedCampaigns?.map(d => d.campaign_id) || [])];

      if (campaignIds.length === 0) {
        return [];
      }

      // Get recent updates from those campaigns
      const { data: updates, error: updatesError } = await supabase
        .from('campaign_updates')
        .select(`
          *,
          campaign:campaigns!inner(
            id,
            title,
            recipient:user_profiles!campaigns_recipient_id_fkey(
              id,
              full_name,
              avatar_url
            )
          )
        `)
        .in('campaign_id', campaignIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (updatesError) throw updatesError;

      return updates || [];
    } catch (error) {
      console.error('Error fetching donor campaign updates:', error);
      throw error;
    }
  },

  /**
   * Get campaigns the user is following (has donated to)
   */
  async getFollowedCampaigns(userId) {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select(`
          campaign:campaigns!inner(
            id,
            title,
            need_type,
            campaign_type,
            goal_amount,
            raised_amount,
            currency,
            status,
            deadline,
            created_at,
            recipient:user_profiles!campaigns_recipient_id_fkey(
              id,
              full_name,
              avatar_url,
              trust_score,
              trust_tier
            )
          )
        `)
        .eq('donor_id', userId)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Remove duplicates and return unique campaigns
      const uniqueCampaigns = data?.reduce((acc, item) => {
        if (!acc.find(c => c.id === item.campaign.id)) {
          acc.push(item.campaign);
        }
        return acc;
      }, []) || [];

      return uniqueCampaigns;
    } catch (error) {
      console.error('Error fetching followed campaigns:', error);
      throw error;
    }
  },

  /**
   * Get donation receipts for a user
   */
  async getUserReceipts(userId, year = null) {
    try {
      let query = supabase
        .from('donation_receipts')
        .select(`
          *,
          donation:donations!inner(
            id,
            amount,
            currency,
            created_at,
            campaign:campaigns!inner(
              id,
              title
            )
          )
        `)
        .eq('donation.donor_id', userId)
        .order('generated_at', { ascending: false });

      if (year) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        query = query
          .gte('generated_at', startDate)
          .lte('generated_at', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching user receipts:', error);
      throw error;
    }
  },

  /**
   * Get donation impact summary for a user
   */
  async getUserImpact(userId) {
    try {
      // Get all completed donations with campaign details
      const { data: donations, error } = await supabase
        .from('donations')
        .select(`
          amount,
          created_at,
          campaign:campaigns!inner(
            id,
            title,
            need_type,
            campaign_type,
            goal_amount,
            raised_amount,
            status,
            recipient:user_profiles!campaigns_recipient_id_fkey(
              id,
              full_name,
              country_iso
            )
          )
        `)
        .eq('donor_id', userId)
        .eq('payment_status', 'completed');

      if (error) throw error;

      // Calculate impact metrics
      const impactData = {
        totalAmount: 0,
        campaignsHelped: new Set(),
        recipientsHelped: new Set(),
        countriesReached: new Set(),
        needTypesSupported: {},
        fundedCampaigns: 0,
        activeCampaigns: 0
      };

      donations?.forEach(donation => {
        impactData.totalAmount += parseFloat(donation.amount);
        impactData.campaignsHelped.add(donation.campaign.id);
        impactData.recipientsHelped.add(donation.campaign.recipient.id);
        
        if (donation.campaign.recipient.country_iso) {
          impactData.countriesReached.add(donation.campaign.recipient.country_iso);
        }

        // Count need types
        const needType = donation.campaign.need_type;
        impactData.needTypesSupported[needType] = (impactData.needTypesSupported[needType] || 0) + 1;

        // Count campaign statuses
        if (donation.campaign.status === 'FUNDED' || donation.campaign.status === 'COMPLETED') {
          impactData.fundedCampaigns++;
        } else if (donation.campaign.status === 'FUNDING') {
          impactData.activeCampaigns++;
        }
      });

      return {
        totalDonated: impactData.totalAmount,
        campaignsSupported: impactData.campaignsHelped.size,
        recipientsHelped: impactData.recipientsHelped.size,
        countriesReached: impactData.countriesReached.size,
        needTypesBreakdown: impactData.needTypesSupported,
        fundedCampaigns: impactData.fundedCampaigns,
        activeCampaigns: impactData.activeCampaigns
      };
    } catch (error) {
      console.error('Error calculating user impact:', error);
      throw error;
    }
  }
};
