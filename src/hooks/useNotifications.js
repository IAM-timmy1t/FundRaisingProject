import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notificationService';
import { supabase } from '../config/supabase';
import { toast } from 'sonner';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState(null);
  const [permissionState, setPermissionState] = useState('default');

  // Initialize notifications
  useEffect(() => {
    initializeNotifications();
    loadNotifications();
    loadUnreadCount();
    
    // Subscribe to real-time notifications
    const subscription = subscribeToNotifications();
    
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      await notificationService.initialize();
      checkPermission();
      const prefs = await notificationService.loadUserPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  };

  const checkPermission = () => {
    if ('Notification' in window) {
      setPermissionState(Notification.permission);
    }
  };

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_history')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_unread_notification_count');

      if (error) throw error;
      setUnreadCount(data || 0);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const subscribeToNotifications = () => {
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_history',
          filter: `user_id=eq.${supabase.auth.getUser()?.id}`
        },
        (payload) => {
          // Add new notification to the list
          setNotifications(prev => [payload.new, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast notification
          showToastNotification(payload.new);
        }
      )
      .subscribe();

    return subscription;
  };

  const showToastNotification = (notification) => {
    const onClick = () => {
      markAsRead(notification.id);
      handleNotificationClick(notification);
    };

    toast(notification.title, {
      description: notification.body,
      action: {
        label: 'View',
        onClick
      }
    });
  };

  const handleNotificationClick = (notification) => {
    const data = notification.data || {};
    let url = '/';

    switch (notification.type) {
      case 'donations':
        url = `/campaigns/${data.campaign_id}`;
        break;
      case 'updates':
        url = `/campaigns/${data.campaign_id}/updates/${data.update_id}`;
        break;
      case 'goal_reached':
      case 'campaign_ending':
        url = `/campaigns/${data.campaign_id}`;
        break;
      case 'trust_changes':
        url = '/profile#trust-score';
        break;
    }

    window.location.href = url;
  };

  const markAsRead = useCallback(async (notificationId) => {
    try {
      const { error } = await supabase
        .rpc('mark_notification_read', { notification_id: notificationId });

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true, read_at: new Date() } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notifications
        .filter(n => !n.read)
        .map(n => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notification_history')
        .update({ read: true, read_at: new Date() })
        .in('id', unreadIds);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true, read_at: new Date() }))
      );
      setUnreadCount(0);
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  }, [notifications]);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notification_history')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  }, [notifications]);

  const requestPermission = useCallback(async () => {
    const granted = await notificationService.requestPermission();
    checkPermission();
    return granted;
  }, []);

  const sendTestNotification = useCallback(async () => {
    try {
      // Create a test notification
      await notificationService.sendNotification(
        supabase.auth.getUser()?.id,
        'donations',
        {
          donor_name: 'Test Donor',
          amount: '$100',
          campaign_title: 'Test Campaign',
          campaign_id: 'test-id',
          donation_id: 'test-donation-id'
        }
      );
      
      toast.success('Test notification sent!');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast.error('Failed to send test notification');
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    preferences,
    permissionState,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestPermission,
    sendTestNotification,
    refreshNotifications: loadNotifications
  };
};