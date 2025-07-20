import { supabase } from './customSupabaseClient';

class CampaignService {
  /**
   * Create a new campaign
   * @param {Object} campaignData - Campaign data
   * @returns {Promise<Object>} Created campaign
   */
  async createCampaign(campaignData) {
    try {
      // Call edge function
      const { data, error } = await supabase.functions.invoke('create-campaign', {
        body: campaignData
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data.data;
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  /**
   * Update an existing campaign
   * @param {string} campaignId - Campaign ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated campaign
   */
  async updateCampaign(campaignId, updates) {
    try {
      const { data, error } = await supabase.functions.invoke('update-campaign', {
        body: {
          campaign_id: campaignId,
          ...updates
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data.data;
    } catch (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }
  }

  /**
   * Get a single campaign by ID or slug
   * @param {Object} params - { id: string } or { slug: string }
   * @returns {Promise<Object>} Campaign data
   */
  async getCampaign(params) {
    try {
      const body = {};
      if (params.id) body.id = params.id;
      if (params.slug) body.slug = params.slug;

      const { data, error } = await supabase.functions.invoke('get-campaign', {
        body: body
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data.data;
    } catch (error) {
      console.error('Error fetching campaign:', error);
      throw error;
    }
  }

  /**
   * List campaigns with filters and pagination
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Paginated campaigns list
   */
  async listCampaigns(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add all parameters to query string
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const { data, error } = await supabase.functions.invoke(
        `list-campaigns?${queryParams.toString()}`
      );

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data.data;
    } catch (error) {
      console.error('Error listing campaigns:', error);
      throw error;
    }
  }

  /**
   * Delete a campaign (soft delete)
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<void>}
   */
  async deleteCampaign(campaignId) {
    try {
      const { data, error } = await supabase.functions.invoke('delete-campaign', {
        body: { campaign_id: campaignId }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return;
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  }

  /**
   * Submit a campaign for review
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>} Updated campaign
   */
  async submitForReview(campaignId) {
    try {
      const { data, error } = await supabase.functions.invoke('submit-campaign-for-review', {
        body: { campaign_id: campaignId }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data.data;
    } catch (error) {
      console.error('Error submitting campaign for review:', error);
      throw error;
    }
  }

  /**
   * Get campaign categories
   * @returns {Promise<Array>} List of categories
   */
  async getCategories() {
    try {
      const { data, error } = await supabase
        .from('campaign_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Upload campaign media
   * @param {string} campaignId - Campaign ID
   * @param {File} file - File to upload
   * @param {Object} metadata - Media metadata
   * @returns {Promise<Object>} Media record
   */
  async uploadMedia(campaignId, file, metadata = {}) {
    try {
      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${campaignId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('campaign-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('campaign-media')
        .getPublicUrl(fileName);

      // Create media record
      const { data: mediaRecord, error: dbError } = await supabase
        .from('campaign_media')
        .insert({
          campaign_id: campaignId,
          media_type: metadata.media_type || 'image',
          media_url: publicUrl,
          thumbnail_url: metadata.thumbnail_url || publicUrl,
          caption: metadata.caption || '',
          display_order: metadata.display_order || 0,
          is_primary: metadata.is_primary || false,
          file_size: file.size,
          mime_type: file.type
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return mediaRecord;
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  }

  /**
   * Delete campaign media
   * @param {string} mediaId - Media record ID
   * @param {string} mediaUrl - Media URL for storage deletion
   * @returns {Promise<void>}
   */
  async deleteMedia(mediaId, mediaUrl) {
    try {
      // Extract file path from URL
      const urlParts = mediaUrl.split('/');
      const filePath = urlParts.slice(urlParts.indexOf('campaign-media') + 1).join('/');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('campaign-media')
        .remove([filePath]);

      if (storageError) console.error('Storage deletion error:', storageError);

      // Delete database record
      const { error: dbError } = await supabase
        .from('campaign_media')
        .delete()
        .eq('id', mediaId);

      if (dbError) throw dbError;

      return;
    } catch (error) {
      console.error('Error deleting media:', error);
      throw error;
    }
  }

  /**
   * Add campaign tags
   * @param {string} campaignId - Campaign ID
   * @param {Array<string>} tags - Tags to add
   * @returns {Promise<Array>} Created tags
   */
  async addTags(campaignId, tags) {
    try {
      const tagRecords = tags.map(tag => ({
        campaign_id: campaignId,
        tag: tag.toLowerCase().trim()
      }));

      const { data, error } = await supabase
        .from('campaign_tags')
        .insert(tagRecords)
        .select();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error adding tags:', error);
      throw error;
    }
  }

  /**
   * Remove campaign tag
   * @param {string} campaignId - Campaign ID
   * @param {string} tag - Tag to remove
   * @returns {Promise<void>}
   */
  async removeTag(campaignId, tag) {
    try {
      const { error } = await supabase
        .from('campaign_tags')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('tag', tag.toLowerCase().trim());

      if (error) throw error;

      return;
    } catch (error) {
      console.error('Error removing tag:', error);
      throw error;
    }
  }

  /**
   * Add campaign beneficiaries
   * @param {string} campaignId - Campaign ID
   * @param {Array<Object>} beneficiaries - Beneficiary data
   * @returns {Promise<Array>} Created beneficiaries
   */
  async addBeneficiaries(campaignId, beneficiaries) {
    try {
      const records = beneficiaries.map(b => ({
        campaign_id: campaignId,
        ...b
      }));

      const { data, error } = await supabase
        .from('campaign_beneficiaries')
        .insert(records)
        .select();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error adding beneficiaries:', error);
      throw error;
    }
  }

  /**
   * Update campaign status
   * @param {string} campaignId - Campaign ID
   * @param {string} newStatus - New status
   * @returns {Promise<Object>} Updated campaign
   */
  async updateStatus(campaignId, newStatus) {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaignId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  }

  /**
   * Get user's campaigns
   * @param {string} userId - User ID
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} User's campaigns
   */
  async getUserCampaigns(userId, status = null) {
    try {
      let query = supabase
        .from('campaigns')
        .select(`
          *,
          category:campaign_categories(name, slug, icon_name),
          donations(count),
          campaign_updates(count)
        `)
        .eq('recipient_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate progress for each campaign
      return data.map(campaign => ({
        ...campaign,
        progress: campaign.goal_amount > 0 
          ? Math.round((campaign.raised_amount / campaign.goal_amount) * 100) 
          : 0,
        donations_count: campaign.donations?.[0]?.count || 0,
        updates_count: campaign.campaign_updates?.[0]?.count || 0
      }));
    } catch (error) {
      console.error('Error fetching user campaigns:', error);
      throw error;
    }
  }

  /**
   * Get campaign statistics
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>} Campaign statistics
   */
  async getCampaignStats(campaignId) {
    try {
      const [campaign, donations, updates] = await Promise.all([
        // Get campaign basic stats
        supabase
          .from('campaigns')
          .select('goal_amount, raised_amount, donor_count, view_count, share_count')
          .eq('id', campaignId)
          .single(),
        
        // Get donation stats
        supabase
          .from('donations')
          .select('amount')
          .eq('campaign_id', campaignId)
          .eq('payment_status', 'completed'),
        
        // Get update stats
        supabase
          .from('campaign_updates')
          .select('id')
          .eq('campaign_id', campaignId)
      ]);

      if (campaign.error) throw campaign.error;

      const avgDonation = donations.data?.length > 0
        ? donations.data.reduce((sum, d) => sum + parseFloat(d.amount), 0) / donations.data.length
        : 0;

      return {
        ...campaign.data,
        progress: campaign.data.goal_amount > 0 
          ? Math.round((campaign.data.raised_amount / campaign.data.goal_amount) * 100) 
          : 0,
        average_donation: avgDonation,
        total_updates: updates.data?.length || 0
      };
    } catch (error) {
      console.error('Error fetching campaign stats:', error);
      throw error;
    }
  }

  /**
   * Search campaigns
   * @param {string} searchTerm - Search term
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Search results
   */
  async searchCampaigns(searchTerm, filters = {}) {
    try {
      return await this.listCampaigns({
        search: searchTerm,
        ...filters,
        limit: filters.limit || 20
      });
    } catch (error) {
      console.error('Error searching campaigns:', error);
      throw error;
    }
  }

  /**
   * Get campaign updates
   * @param {string} campaignId - Campaign ID
   * @param {Object} params - Query parameters (limit, offset)
   * @returns {Promise<Object>} Paginated updates list
   */
  async getCampaignUpdates(campaignId, params = {}) {
    try {
      const queryParams = new URLSearchParams({
        campaign_id: campaignId,
        limit: params.limit || 20,
        offset: params.offset || 0
      });

      const { data, error } = await supabase.functions.invoke(
        `get-campaign-updates?${queryParams.toString()}`
      );

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data.data;
    } catch (error) {
      console.error('Error fetching campaign updates:', error);
      throw error;
    }
  }

  /**
   * Create a campaign update
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Created update
   */
  async createCampaignUpdate(updateData) {
    try {
      const { data, error } = await supabase.functions.invoke('create-campaign-update', {
        body: updateData
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data.data;
    } catch (error) {
      console.error('Error creating campaign update:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const campaignService = new CampaignService();
