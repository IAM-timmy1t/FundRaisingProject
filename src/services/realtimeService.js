import { supabase } from '@/lib/customSupabaseClient';
import { toast } from 'sonner';

/**
 * Real-time Update Broadcasting Service
 * Handles Supabase Realtime subscriptions for campaign updates
 */
class RealtimeService {
  constructor() {
    this.subscriptions = new Map();
    this.presenceChannels = new Map();
    this.listeners = new Map();
  }

  /**
   * Subscribe to campaign updates
   */
  subscribeToCampaignUpdates(campaignId, callbacks = {}) {
    const channelName = `campaign:${campaignId}:updates`;
    
    // Clean up existing subscription
    this.unsubscribe(channelName);

    const channel = supabase.channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'campaign_updates',
          filter: `campaign_id=eq.${campaignId}`
        },
        (payload) => {
          console.log('New update received:', payload);
          if (callbacks.onNewUpdate) {
            callbacks.onNewUpdate(payload.new);
          }
          // Show notification
          this.showUpdateNotification(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaign_updates',
          filter: `campaign_id=eq.${campaignId}`
        },
        (payload) => {
          console.log('Update modified:', payload);
          if (callbacks.onUpdateModified) {
            callbacks.onUpdateModified(payload.new);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to campaign ${campaignId} updates`);
        }
      });

    this.subscriptions.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to update interactions (likes, comments, views)
   */
  subscribeToUpdateInteractions(updateId, callbacks = {}) {
    const channelName = `update:${updateId}:interactions`;
    
    // Clean up existing subscription
    this.unsubscribe(channelName);

    const channel = supabase.channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'update_reactions',
          filter: `update_id=eq.${updateId}`
        },
        (payload) => {
          console.log('Reaction change:', payload);
          if (callbacks.onReactionChange) {
            callbacks.onReactionChange(payload);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'update_comments',
          filter: `update_id=eq.${updateId}`
        },
        (payload) => {
          console.log('New comment:', payload);
          if (callbacks.onNewComment) {
            callbacks.onNewComment(payload.new);
          }
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to campaign presence (who's viewing)
   */
  joinCampaignPresence(campaignId, userProfile) {
    const channelName = `campaign:${campaignId}:presence`;
    
    // Clean up existing presence
    this.leavePresence(channelName);

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userProfile.id
        }
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('Presence sync:', state);
        this.notifyPresenceListeners(campaignId, state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
        this.notifyPresenceListeners(campaignId, channel.presenceState());
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
        this.notifyPresenceListeners(campaignId, channel.presenceState());
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userProfile.id,
            user_name: userProfile.name || 'Anonymous',
            avatar_url: userProfile.avatar_url,
            online_at: new Date().toISOString()
          });
        }
      });

    this.presenceChannels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to donation notifications
   */
  subscribeToDonations(campaignId, callbacks = {}) {
    const channelName = `campaign:${campaignId}:donations`;
    
    // Clean up existing subscription
    this.unsubscribe(channelName);

    const channel = supabase.channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'donations',
          filter: `campaign_id=eq.${campaignId}`
        },
        async (payload) => {
          console.log('New donation:', payload);
          if (callbacks.onNewDonation) {
            callbacks.onNewDonation(payload.new);
          }
          // Show donation notification
          this.showDonationNotification(payload.new);
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);
    return channel;
  }

  /**
   * Add presence listener
   */
  addPresenceListener(campaignId, callback) {
    const key = `presence:${campaignId}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
  }

  /**
   * Remove presence listener
   */
  removePresenceListener(campaignId, callback) {
    const key = `presence:${campaignId}`;
    if (this.listeners.has(key)) {
      this.listeners.get(key).delete(callback);
    }
  }

  /**
   * Notify presence listeners
   */
  notifyPresenceListeners(campaignId, presenceState) {
    const key = `presence:${campaignId}`;
    if (this.listeners.has(key)) {
      const viewers = Object.values(presenceState).flatMap(presences => presences);
      this.listeners.get(key).forEach(callback => {
        callback(viewers);
      });
    }
  }

  /**
   * Show update notification
   */
  showUpdateNotification(update) {
    toast.info('New Campaign Update', {
      description: `${update.title || 'A new update'} has been posted`,
      duration: 5000,
      action: {
        label: 'View',
        onClick: () => {
          // Scroll to updates section or open update modal
          const updatesSection = document.getElementById('campaign-updates');
          if (updatesSection) {
            updatesSection.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    });
  }

  /**
   * Show donation notification
   */
  showDonationNotification(donation) {
    const amount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: donation.currency || 'USD'
    }).format(donation.amount);

    toast.success('New Donation!', {
      description: `Someone just donated ${amount} to this campaign!`,
      duration: 5000,
      style: {
        background: '#22c55e',
        color: 'white'
      }
    });
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channelName) {
    if (this.subscriptions.has(channelName)) {
      const channel = this.subscriptions.get(channelName);
      channel.unsubscribe();
      this.subscriptions.delete(channelName);
    }
  }

  /**
   * Leave presence channel
   */
  leavePresence(channelName) {
    if (this.presenceChannels.has(channelName)) {
      const channel = this.presenceChannels.get(channelName);
      channel.untrack();
      channel.unsubscribe();
      this.presenceChannels.delete(channelName);
    }
  }

  /**
   * Clean up all subscriptions
   */
  cleanup() {
    // Unsubscribe from all channels
    this.subscriptions.forEach((channel, name) => {
      this.unsubscribe(name);
    });

    // Leave all presence channels
    this.presenceChannels.forEach((channel, name) => {
      this.leavePresence(name);
    });

    // Clear listeners
    this.listeners.clear();
  }

  /**
   * Broadcast update view
   */
  async trackUpdateView(updateId, userId) {
    try {
      // Increment view count using RPC for atomic operation
      const { data, error } = await supabase
        .rpc('increment_update_views', {
          update_id: updateId,
          viewer_id: userId
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error tracking update view:', error);
    }
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();
export default realtimeService;