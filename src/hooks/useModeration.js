import { useState, useCallback } from 'react';
import { moderationService } from '../../services/moderationService';
import { supabase } from '../../lib/supabaseClient';

export const useModeration = () => {
  const [moderating, setModerating] = useState(false);
  const [moderationResult, setModerationResult] = useState(null);
  const [error, setError] = useState(null);

  const moderateCampaign = useCallback(async (campaignData) => {
    setModerating(true);
    setError(null);
    
    try {
      // Run moderation analysis
      const result = await moderationService.analyzeCampaign(campaignData);
      setModerationResult(result);
      
      // Update campaign status based on moderation
      if (campaignData.id) {
        await moderationService.updateCampaignStatus(campaignData.id, result);
      }
      
      return result;
    } catch (err) {
      console.error('Moderation failed:', err);
      setError(err.message);
      return null;
    } finally {
      setModerating(false);
    }
  }, []);

  const approveCampaign = useCallback(async (campaignId, reviewNotes = '') => {
    try {
      const { data, error } = await supabase.rpc('update_campaign_moderation_status', {
        p_campaign_id: campaignId,
        p_decision: 'approved',
        p_reviewer_id: (await supabase.auth.getUser()).data.user?.id,
        p_notes: reviewNotes
      });

      if (error) throw error;
      
      return { success: true };
    } catch (err) {
      console.error('Failed to approve campaign:', err);
      return { success: false, error: err.message };
    }
  }, []);

  const rejectCampaign = useCallback(async (campaignId, reviewNotes = '') => {
    try {
      const { data, error } = await supabase.rpc('update_campaign_moderation_status', {
        p_campaign_id: campaignId,
        p_decision: 'rejected',
        p_reviewer_id: (await supabase.auth.getUser()).data.user?.id,
        p_notes: reviewNotes
      });

      if (error) throw error;
      
      return { success: true };
    } catch (err) {
      console.error('Failed to reject campaign:', err);
      return { success: false, error: err.message };
    }
  }, []);

  const requestChanges = useCallback(async (campaignId, changes, reviewNotes = '') => {
    try {
      // Store requested changes
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: (await supabase.from('campaigns').select('creator_id').eq('id', campaignId).single()).data.creator_id,
          type: 'campaign_changes_requested',
          title: 'Changes Required for Your Campaign',
          message: `Your campaign requires changes before it can be approved. ${changes.join(', ')}`,
          data: { campaignId, changes, reviewNotes }
        });

      if (notificationError) throw notificationError;

      // Update campaign status
      const { error } = await supabase.rpc('update_campaign_moderation_status', {
        p_campaign_id: campaignId,
        p_decision: 'review',
        p_reviewer_id: (await supabase.auth.getUser()).data.user?.id,
        p_notes: reviewNotes
      });

      if (error) throw error;
      
      return { success: true };
    } catch (err) {
      console.error('Failed to request changes:', err);
      return { success: false, error: err.message };
    }
  }, []);

  const getModerationHistory = useCallback(async (campaignId) => {
    try {
      const history = await moderationService.getModerationHistory(campaignId);
      return history;
    } catch (err) {
      console.error('Failed to get moderation history:', err);
      return [];
    }
  }, []);

  const checkContent = useCallback(async (content, type = 'general') => {
    // Quick content check without full campaign analysis
    const fullContent = typeof content === 'string' ? content : JSON.stringify(content);
    
    const checks = {
      hasLuxury: /\b(luxury|luxurious|deluxe|premium|ferrari|rolex)\b/gi.test(fullContent),
      hasInappropriate: /\b(scam|fraud|drugs|weapons)\b/gi.test(fullContent),
      hasSuspicious: /\b(quick money|guaranteed returns|wire transfer)\b/gi.test(fullContent),
      hasTrust: /\b(receipt|documentation|transparent|God|faith)\b/gi.test(fullContent)
    };

    return {
      passed: !checks.hasLuxury && !checks.hasInappropriate && !checks.hasSuspicious,
      checks
    };
  }, []);

  return {
    moderating,
    moderationResult,
    error,
    moderateCampaign,
    approveCampaign,
    rejectCampaign,
    requestChanges,
    getModerationHistory,
    checkContent
  };
};
