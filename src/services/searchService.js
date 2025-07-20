// Advanced search service for campaign discovery
import { supabase } from '@/lib/supabase';

class SearchService {
  // Perform advanced campaign search
  async searchCampaigns({
    query = '',
    category = null,
    location = null,
    status = null,
    verificationStatus = null,
    featured = null,
    goalMin = null,
    goalMax = null,
    progressMin = null,
    progressMax = null,
    sortBy = 'relevance',
    order = 'DESC',
    limit = 20,
    offset = 0,
    userLocation = null,
    radius = null
  }) {
    try {
      // Call the advanced search function
      const { data, error } = await supabase.rpc('search_campaigns_advanced', {
        search_query: query || null,
        category_filter: category,
        location_filter: location,
        status_filter: status,
        verification_filter: verificationStatus,
        featured_filter: featured,
        goal_min: goalMin,
        goal_max: goalMax,
        progress_min: progressMin,
        progress_max: progressMax,
        sort_by: sortBy,
        sort_order: order,
        limit_count: limit,
        offset_count: offset,
        user_latitude: userLocation?.latitude || null,
        user_longitude: userLocation?.longitude || null,
        radius_km: radius
      });

      if (error) throw error;

      // Extract total results from first row
      const totalResults = data[0]?.total_results || 0;
      const campaigns = data || [];

      return {
        campaigns,
        totalResults,
        totalPages: Math.ceil(totalResults / limit),
        currentPage: Math.floor(offset / limit) + 1
      };
    } catch (error) {
      console.error('Error searching campaigns:', error);
      throw error;
    }
  }

  // Get search suggestions
  async getSearchSuggestions(query) {
    try {
      if (!query || query.length < 2) return [];

      const { data, error } = await supabase.rpc('get_search_suggestions', {
        query_text: query,
        max_suggestions: 10
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }

  // Track search history for logged-in users
  async trackSearchHistory(userId, query, filters, resultsCount) {
    try {
      if (!userId) return;

      await supabase.rpc('track_search_history', {
        user_id_param: userId,
        search_query_param: query,
        filters_param: filters,
        results_count_param: resultsCount
      });
    } catch (error) {
      console.error('Error tracking search history:', error);
    }
  }

  // Get user's search history
  async getUserSearchHistory(userId, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', userId)
        .order('searched_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting search history:', error);
      return [];
    }
  }

  // Save a search for alerts
  async saveSearch(userId, name, query, filters, emailAlerts = false, alertFrequency = 'daily') {
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .insert({
          user_id: userId,
          name,
          search_query: query,
          filters,
          email_alerts: emailAlerts,
          alert_frequency: alertFrequency
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving search:', error);
      throw error;
    }
  }

  // Get user's saved searches
  async getUserSavedSearches(userId) {
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting saved searches:', error);
      return [];
    }
  }

  // Update saved search
  async updateSavedSearch(searchId, updates) {
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', searchId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating saved search:', error);
      throw error;
    }
  }

  // Delete saved search
  async deleteSavedSearch(searchId) {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', searchId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting saved search:', error);
      throw error;
    }
  }

  // Track campaign view
  async trackCampaignView(campaignId, userId = null, sessionId = null, referrerCampaignId = null) {
    try {
      const { error } = await supabase
        .from('campaign_views')
        .insert({
          campaign_id: campaignId,
          user_id: userId,
          session_id: sessionId || this.generateSessionId(),
          referrer_campaign_id: referrerCampaignId,
          viewed_at: new Date().toISOString()
        });

      if (error && error.code !== '23505') { // Ignore unique constraint violations
        throw error;
      }
    } catch (error) {
      console.error('Error tracking campaign view:', error);
    }
  }

  // Get related campaigns
  async getRelatedCampaigns(campaignId, limit = 6) {
    try {
      const { data, error } = await supabase.rpc('get_related_campaigns', {
        campaign_id_param: campaignId,
        limit_count: limit
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting related campaigns:', error);
      return [];
    }
  }

  // Get trending campaigns
  async getTrendingCampaigns(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('trending_campaigns')
        .select('*')
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting trending campaigns:', error);
      return [];
    }
  }

  // Get "people also viewed" campaigns
  async getPeopleAlsoViewed(campaignId, limit = 6) {
    try {
      // Get campaigns viewed by users who also viewed this campaign
      const { data, error } = await supabase.rpc('get_people_also_viewed', {
        campaign_id: campaignId,
        limit_count: limit
      });

      if (error) {
        // Fallback to category-based recommendations
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('category')
          .eq('id', campaignId)
          .single();

        if (campaign) {
          const { data: similar } = await supabase
            .from('campaigns')
            .select('*')
            .eq('category', campaign.category)
            .neq('id', campaignId)
            .eq('status', 'active')
            .limit(limit);

          return similar || [];
        }
      }

      return data || [];
    } catch (error) {
      console.error('Error getting people also viewed:', error);
      return [];
    }
  }

  // Get search alerts for a user
  async getUserSearchAlerts(userId) {
    try {
      const { data, error } = await supabase
        .from('search_alerts')
        .select(`
          *,
          saved_searches!inner(
            id,
            name,
            search_query,
            filters
          ),
          campaigns(
            id,
            title,
            slug,
            image_url,
            current_amount,
            goal_amount
          )
        `)
        .eq('saved_searches.user_id', userId)
        .order('alerted_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting search alerts:', error);
      return [];
    }
  }

  // Clear search history
  async clearSearchHistory(userId) {
    try {
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error clearing search history:', error);
      throw error;
    }
  }

  // Get popular searches
  async getPopularSearches(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('search_history')
        .select('search_query, COUNT(*)')
        .group('search_query')
        .order('count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data?.map(item => item.search_query) || [];
    } catch (error) {
      console.error('Error getting popular searches:', error);
      return [];
    }
  }

  // Utility function to generate session ID
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Parse location from text (could be enhanced with geocoding API)
  parseLocation(locationText) {
    // Simple implementation - could be enhanced with geocoding
    const patterns = {
      city: /^([A-Za-z\s]+),\s*([A-Z]{2})$/,
      state: /^([A-Z]{2})$/,
      country: /^([A-Za-z\s]+)$/
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      const match = locationText.match(pattern);
      if (match) {
        return { type, value: match[1], full: locationText };
      }
    }

    return { type: 'text', value: locationText, full: locationText };
  }
}

export const searchService = new SearchService();
