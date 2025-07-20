// Social sharing service for campaign share tracking and analytics
import { supabase } from '@/lib/supabase';

class SocialSharingService {
  // Track when someone shares a campaign
  async trackShare(campaignId, platform, userId = null) {
    try {
      const { data, error } = await supabase
        .from('campaign_shares')
        .insert({
          campaign_id: campaignId,
          platform,
          user_id: userId,
          shared_at: new Date().toISOString()
        });

      if (error) throw error;

      // Track in analytics events
      await supabase
        .from('campaign_analytics_events')
        .insert({
          campaign_id: campaignId,
          event_type: 'share',
          event_data: { platform },
          user_id: userId
        });

      return data;
    } catch (error) {
      console.error('Error tracking share:', error);
      throw error;
    }
  }

  // Get share statistics for a campaign
  async getShareStats(campaignId) {
    try {
      const { data, error } = await supabase
        .from('campaign_shares')
        .select('platform, COUNT(*)')
        .eq('campaign_id', campaignId)
        .group('platform');

      if (error) throw error;

      // Transform to object
      const stats = {};
      data?.forEach(row => {
        stats[row.platform] = row.count;
      });

      return stats;
    } catch (error) {
      console.error('Error getting share stats:', error);
      return {};
    }
  }

  // Generate share URLs for different platforms
  generateShareUrls(campaign, baseUrl) {
    const campaignUrl = `${baseUrl}/campaigns/${campaign.id}`;
    const title = encodeURIComponent(campaign.title);
    const description = encodeURIComponent(campaign.description?.substring(0, 200) + '...');

    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(campaignUrl)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(campaignUrl)}&text=${title}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(campaignUrl)}`,
      whatsapp: `https://wa.me/?text=${title}%20${encodeURIComponent(campaignUrl)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(campaignUrl)}&text=${title}`,
      email: `mailto:?subject=${title}&body=${description}%0A%0A${encodeURIComponent(campaignUrl)}`,
      copy: campaignUrl
    };
  }

  // Track referral conversions
  async trackReferralConversion(campaignId, referralSource, donationId) {
    try {
      const { data, error } = await supabase
        .from('share_conversions')
        .insert({
          campaign_id: campaignId,
          referral_source: referralSource,
          donation_id: donationId,
          converted_at: new Date().toISOString()
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error tracking referral conversion:', error);
      throw error;
    }
  }

  // Get referral conversion stats
  async getReferralStats(campaignId) {
    try {
      const { data, error } = await supabase
        .from('share_conversions')
        .select(`
          referral_source,
          COUNT(*) as conversions,
          donations!inner(amount)
        `)
        .eq('campaign_id', campaignId)
        .group('referral_source');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting referral stats:', error);
      return [];
    }
  }

  // Check if user has shared campaign (for share incentives)
  async hasUserShared(campaignId, userId) {
    try {
      const { count, error } = await supabase
        .from('campaign_shares')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('user_id', userId);

      if (error) throw error;
      return count > 0;
    } catch (error) {
      console.error('Error checking user share:', error);
      return false;
    }
  }

  // Track share milestone achievements
  async checkShareMilestones(campaignId) {
    try {
      const { count, error } = await supabase
        .from('campaign_shares')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);

      if (error) throw error;

      const milestones = [10, 50, 100, 500, 1000];
      const achievedMilestones = milestones.filter(m => count >= m);

      if (achievedMilestones.length > 0) {
        const latestMilestone = Math.max(...achievedMilestones);
        
        // Check if this milestone was already recorded
        const { data: existing } = await supabase
          .from('campaign_milestones')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('milestone_type', 'shares')
          .eq('milestone_value', latestMilestone)
          .single();

        if (!existing) {
          // Record new milestone
          await supabase
            .from('campaign_milestones')
            .insert({
              campaign_id: campaignId,
              milestone_type: 'shares',
              milestone_value: latestMilestone,
              achieved_at: new Date().toISOString()
            });

          return { newMilestone: latestMilestone, totalShares: count };
        }
      }

      return { totalShares: count };
    } catch (error) {
      console.error('Error checking share milestones:', error);
      return null;
    }
  }
}

export const socialSharingService = new SocialSharingService();