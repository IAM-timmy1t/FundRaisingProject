import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from 'sonner';
import { Bell, AlertCircle } from 'lucide-react';

/**
 * Real-time campaign updates hook
 * Task #19: Real-time Update Broadcasting
 * 
 * This hook subscribes to real-time updates for a specific campaign
 * and returns new updates as they are posted
 */
export const useCampaignRealtime = (campaignId) => {
  const [realtimeUpdates, setRealtimeUpdates] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!campaignId) return;

    let channel;

    const setupRealtimeSubscription = async () => {
      try {
        // Create a unique channel for this campaign
        channel = supabase
          .channel(`campaign:${campaignId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'campaign_updates',
              filter: `campaign_id=eq.${campaignId}`
            },
            async (payload) => {
              console.log('New campaign update received:', payload);
              
              // Fetch the complete update with author info
              const { data: update, error } = await supabase
                .from('campaign_updates')
                .select(`
                  *,
                  author:user_profiles!author_id(
                    id,
                    display_name,
                    profile_image_url
                  )
                `)
                .eq('id', payload.new.id)
                .single();

              if (!error && update) {
                setRealtimeUpdates(prev => [update, ...prev]);
                
                // Show notification
                toast.success('New update posted!', {
                  description: update.title,
                  icon: <Bell className="w-4 h-4" />,
                });
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'campaigns',
              filter: `id=eq.${campaignId}`
            },
            (payload) => {
              console.log('Campaign updated:', payload);
              
              // Handle campaign status changes
              if (payload.new.status !== payload.old.status) {
                const statusMessages = {
                  'FUNDED': '🎉 Campaign has reached its goal!',
                  'COMPLETED': '✅ Campaign has been completed!',
                  'CANCELLED': '❌ Campaign has been cancelled'
                };
                
                const message = statusMessages[payload.new.status];
                if (message) {
                  toast.info(message, {
                    duration: 5000,
                    icon: <AlertCircle className="w-4 h-4" />,
                  });
                }
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setIsConnected(true);
              setError(null);
              console.log(`Subscribed to campaign ${campaignId} updates`);
            }
          });

      } catch (err) {
        console.error('Error setting up realtime subscription:', err);
        setError(err.message);
        setIsConnected(false);
      }
    };

    setupRealtimeSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        console.log(`Unsubscribing from campaign ${campaignId} updates`);
        supabase.removeChannel(channel);
      }
      setIsConnected(false);
    };
  }, [campaignId]);

  return {
    realtimeUpdates,
    isConnected,
    error,
    clearUpdates: () => setRealtimeUpdates([])
  };
};

/**
 * Real-time donation tracking hook
 * 
 * This hook subscribes to real-time donation events for a campaign
 * and updates the funding progress live
 */
export const useDonationRealtime = (campaignId) => {
  const [realtimeDonations, setRealtimeDonations] = useState([]);
  const [totalRaised, setTotalRaised] = useState(0);
  const [donorCount, setDonorCount] = useState(0);

  useEffect(() => {
    if (!campaignId) return;

    let channel;

    const setupDonationSubscription = async () => {
      channel = supabase
        .channel(`donations:${campaignId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'donations',
            filter: `campaign_id=eq.${campaignId}`
          },
          async (payload) => {
            // Only process completed donations
            if (payload.new.payment_status !== 'completed') return;

            console.log('New donation received:', payload);
            
            // Add to realtime donations
            setRealtimeDonations(prev => [payload.new, ...prev]);
            
            // Update totals
            setTotalRaised(prev => prev + parseFloat(payload.new.amount));
            setDonorCount(prev => prev + 1);
            
            // Show notification if donation is not anonymous
            if (!payload.new.is_anonymous && payload.new.donor_name) {
              toast.success(`New donation from ${payload.new.donor_name}!`, {
                description: payload.new.show_amount ? `$${payload.new.amount}` : 'Amount hidden',
                icon: '💝',
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'donations',
            filter: `campaign_id=eq.${campaignId}`
          },
          (payload) => {
            // Handle refunds
            if (payload.old.payment_status === 'completed' && 
                payload.new.payment_status === 'refunded') {
              setTotalRaised(prev => prev - parseFloat(payload.new.amount));
              setDonorCount(prev => Math.max(0, prev - 1));
            }
          }
        )
        .subscribe();
    };

    setupDonationSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [campaignId]);

  return {
    realtimeDonations,
    totalRaised,
    donorCount
  };
};

/**
 * Real-time notifications hook
 * 
 * This hook subscribes to user notifications and shows them in real-time
 */
export const useNotificationRealtime = (userId) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);

  useEffect(() => {
    if (!userId) return;

    let channel;

    const setupNotificationSubscription = async () => {
      // Get initial unread count
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      setUnreadCount(count || 0);

      // Subscribe to new notifications
      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('New notification:', payload);
            
            setRecentNotifications(prev => [payload.new, ...prev].slice(0, 10));
            setUnreadCount(prev => prev + 1);
            
            // Show browser notification if permitted
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(payload.new.title, {
                body: payload.new.message,
                icon: '/icon-192x192.png',
                badge: '/icon-192x192.png',
                tag: payload.new.id
              });
            }
            
            // Show toast notification
            toast.info(payload.new.title, {
              description: payload.new.message,
              duration: 5000,
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            // Update unread count when notification is read
            if (!payload.old.read && payload.new.read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        )
        .subscribe();
    };

    setupNotificationSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  const markAsRead = async (notificationId) => {
    await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  return {
    unreadCount,
    recentNotifications,
    markAsRead,
    requestNotificationPermission
  };
};

/**
 * Campaign analytics realtime hook
 * 
 * Track real-time analytics for campaign performance
 */
export const useCampaignAnalyticsRealtime = (campaignId) => {
  const [viewCount, setViewCount] = useState(0);
  const [uniqueViewers, setUniqueViewers] = useState(new Set());

  useEffect(() => {
    if (!campaignId) return;

    // In a real implementation, this would track page views
    // and update the campaign view_count in the database
    
    const trackView = async () => {
      // Get current user ID or anonymous ID
      const { data: { user } } = await supabase.auth.getUser();
      const viewerId = user?.id || `anon-${Date.now()}`;
      
      if (!uniqueViewers.has(viewerId)) {
        setUniqueViewers(prev => new Set([...prev, viewerId]));
        setViewCount(prev => prev + 1);
        
        // Update database (throttled in production)
        await supabase.rpc('increment_campaign_views', { 
          campaign_id: campaignId 
        });
      }
    };

    trackView();
  }, [campaignId]);

  return {
    viewCount,
    uniqueViewerCount: uniqueViewers.size
  };
};

// Export all hooks
export default {
  useCampaignRealtime,
  useDonationRealtime,
  useNotificationRealtime,
  useCampaignAnalyticsRealtime
};
