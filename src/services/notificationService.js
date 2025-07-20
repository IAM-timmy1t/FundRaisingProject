import { supabase } from '../config/supabase';
import { toast } from 'sonner';
import { emailService } from './emailService';

class NotificationService {
  constructor() {
    this.swRegistration = null;
    this.pushSupported = 'PushManager' in window && 'serviceWorker' in navigator;
    this.permission = 'default';
    this.vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  }

  // Initialize notification service
  async initialize() {
    if (!this.pushSupported) {
      console.log('Push notifications not supported');
      return false;
    }

    try {
      // Register service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered');

      // Check notification permission
      this.permission = Notification.permission;
      
      // Load user preferences
      await this.loadUserPreferences();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  // Request notification permission
  async requestPermission() {
    if (!this.pushSupported) {
      toast.error('Push notifications not supported in this browser');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;

      if (permission === 'granted') {
        await this.subscribeToPush();
        toast.success('Notifications enabled!');
        return true;
      } else {
        toast.error('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to enable notifications');
      return false;
    }
  }

  // Subscribe to push notifications
  async subscribeToPush() {
    if (!this.swRegistration || !this.vapidPublicKey) {
      console.error('Service worker not ready or VAPID key missing');
      return null;
    }

    try {
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      // Save subscription to database
      await this.saveSubscription(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
      return null;
    }
  }

  // Save push subscription to database
  async saveSubscription(subscription) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh_key: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
        auth_key: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
        expires_at: subscription.expirationTime ? new Date(subscription.expirationTime) : null
      }, {
        onConflict: 'user_id,endpoint'
      });

    if (error) {
      console.error('Failed to save subscription:', error);
    }
  }

  // Load user notification preferences
  async loadUserPreferences() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is ok
      console.error('Failed to load preferences:', error);
    }

    return data || this.getDefaultPreferences();
  }

  // Get default notification preferences
  getDefaultPreferences() {
    return {
      email_donations: true,
      email_updates: true,
      email_goal_reached: true,
      email_campaign_ending: true,
      email_trust_changes: false,
      email_digest: 'daily', // 'instant', 'daily', 'weekly', 'never'
      push_donations: true,
      push_updates: true,
      push_goal_reached: true,
      push_campaign_ending: true,
      push_trust_changes: false,
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00'
    };
  }

  // Update notification preferences
  async updatePreferences(preferences) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        ...preferences,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to update preferences:', error);
      toast.error('Failed to save notification preferences');
      return null;
    }

    toast.success('Notification preferences updated');
    return data;
  }

  // Send push notification
  async sendPushNotification(userId, notification) {
    // Check if user has push enabled for this type
    const prefs = await this.getUserPreferences(userId);
    const prefKey = `push_${notification.type}`;
    
    if (!prefs[prefKey]) {
      console.log(`Push notifications disabled for ${notification.type}`);
      return;
    }

    // Check quiet hours
    if (this.isQuietHours(prefs)) {
      console.log('Skipping push due to quiet hours');
      return;
    }

    // Get user's push subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error || !subscriptions?.length) {
      console.log('No push subscriptions found');
      return;
    }

    // Send to all user's devices
    for (const sub of subscriptions) {
      try {
        await this.sendPushToEndpoint(sub, notification);
      } catch (error) {
        console.error('Failed to send push:', error);
        // Remove invalid subscription
        if (error.statusCode === 410) {
          await this.removeSubscription(sub.id);
        }
      }
    }
  }

  // Send push to specific endpoint
  async sendPushToEndpoint(subscription, notification) {
    const response = await fetch('/api/send-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key
          }
        },
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icon-192x192.png',
          badge: '/badge-72x72.png',
          data: notification.data,
          actions: notification.actions
        }
      })
    });

    if (!response.ok) {
      const error = new Error('Push failed');
      error.statusCode = response.status;
      throw error;
    }
  }

  // Send email notification
  async sendEmailNotification(userId, notification) {
    // Check if user has email enabled for this type
    const prefs = await this.getUserPreferences(userId);
    const prefKey = `email_${notification.type}`;
    
    if (!prefs[prefKey]) {
      console.log(`Email notifications disabled for ${notification.type}`);
      return;
    }

    // Check digest preferences
    if (prefs.email_digest !== 'instant' && !notification.urgent) {
      // Queue for digest
      await this.queueForDigest(userId, notification);
      return;
    }

    // Use the appropriate email service method based on notification type
    try {
      switch (notification.type) {
        case 'donations':
          await emailService.sendDonationEmail(userId, notification.data);
          break;
        case 'updates':
          // For updates, we need to get donor emails
          const { data: donations } = await supabase
            .from('donations')
            .select('donor_email')
            .eq('campaign_id', notification.data.campaign_id)
            .eq('status', 'completed');
          
          const donorEmails = [...new Set(donations?.map(d => d.donor_email).filter(Boolean))];
          await emailService.sendUpdateEmail(donorEmails, notification.data);
          break;
        case 'goal_reached':
          await emailService.sendGoalReachedEmail(userId, notification.data);
          break;
        case 'campaign_ending':
          await emailService.sendCampaignEndingEmail(userId, notification.data, notification.data.time_left);
          break;
        case 'trust_changes':
          await emailService.sendTrustScoreChangeEmail(userId, notification.data);
          break;
        default:
          // Fallback to generic email
          const { error } = await supabase.functions.invoke('send-email', {
            body: {
              to: await this.getUserEmail(userId),
              subject: notification.subject,
              html: notification.html,
              text: notification.text
            }
          });
          if (error) throw error;
      }
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }

  // Queue notification for digest
  async queueForDigest(userId, notification) {
    const { error } = await supabase
      .from('notification_queue')
      .insert({
        user_id: userId,
        type: notification.type,
        title: notification.subject,
        body: notification.text,
        data: notification.data,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to queue notification:', error);
    }
  }

  // Send notification (push + email)
  async sendNotification(userId, type, data) {
    const notification = this.formatNotification(type, data);
    
    // Record in notification history
    await this.recordNotification(userId, type, notification);

    // Send push notification
    await this.sendPushNotification(userId, {
      type,
      ...notification.push
    });

    // Send email notification
    await this.sendEmailNotification(userId, {
      type,
      urgent: notification.urgent,
      ...notification.email
    });
  }

  // Format notification based on type
  formatNotification(type, data) {
    const notifications = {
      donations: {
        push: {
          title: 'New Donation!',
          body: `${data.donor_name} donated ${data.amount} to your campaign`,
          icon: '/icons/donation.png',
          data: {
            type: 'donation',
            campaign_id: data.campaign_id,
            donation_id: data.donation_id
          }
        },
        email: {
          subject: `New donation to ${data.campaign_title}`,
          html: this.getEmailTemplate('donation', data),
          text: `${data.donor_name} has donated ${data.amount} to your campaign "${data.campaign_title}". Thank you for your support!`
        },
        urgent: true
      },
      updates: {
        push: {
          title: `Update from ${data.campaign_title}`,
          body: data.update_title,
          icon: '/icons/update.png',
          data: {
            type: 'update',
            campaign_id: data.campaign_id,
            update_id: data.update_id
          }
        },
        email: {
          subject: `New update from ${data.campaign_title}`,
          html: this.getEmailTemplate('update', data),
          text: `${data.campaign_title} posted a new update: ${data.update_title}`
        },
        urgent: false
      },
      goal_reached: {
        push: {
          title: 'Goal Reached! 🎉',
          body: `${data.campaign_title} has reached its funding goal!`,
          icon: '/icons/success.png',
          data: {
            type: 'goal_reached',
            campaign_id: data.campaign_id
          }
        },
        email: {
          subject: `🎉 ${data.campaign_title} reached its goal!`,
          html: this.getEmailTemplate('goal_reached', data),
          text: `Congratulations! ${data.campaign_title} has reached its funding goal of ${data.goal_amount}!`
        },
        urgent: true
      },
      campaign_ending: {
        push: {
          title: 'Campaign Ending Soon',
          body: `${data.campaign_title} ends in ${data.time_left}`,
          icon: '/icons/clock.png',
          data: {
            type: 'campaign_ending',
            campaign_id: data.campaign_id
          },
          actions: [{
            action: 'donate',
            title: 'Donate Now'
          }]
        },
        email: {
          subject: `${data.campaign_title} is ending soon!`,
          html: this.getEmailTemplate('campaign_ending', data),
          text: `${data.campaign_title} will end in ${data.time_left}. Don't miss your chance to contribute!`
        },
        urgent: true
      },
      trust_changes: {
        push: {
          title: 'Trust Score Update',
          body: `Your trust score ${data.change > 0 ? 'increased' : 'decreased'} to ${data.new_score}`,
          icon: '/icons/trust.png',
          data: {
            type: 'trust_change',
            old_score: data.old_score,
            new_score: data.new_score
          }
        },
        email: {
          subject: 'Your Trust Score has changed',
          html: this.getEmailTemplate('trust_change', data),
          text: `Your trust score has ${data.change > 0 ? 'increased' : 'decreased'} from ${data.old_score} to ${data.new_score}.`
        },
        urgent: false
      }
    };

    return notifications[type] || {};
  }

  // Get email template - now delegated to email service
  getEmailTemplate(type, data) {
    // This method is now deprecated in favor of emailService templates
    console.warn('getEmailTemplate is deprecated. Use emailService instead.');
    return '';
  }

  // Record notification in history
  async recordNotification(userId, type, notification) {
    const { error } = await supabase
      .from('notification_history')
      .insert({
        user_id: userId,
        type,
        title: notification.push?.title || notification.email?.subject,
        body: notification.push?.body || notification.email?.text,
        data: notification.push?.data || {},
        sent_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to record notification:', error);
    }
  }

  // Get user preferences
  async getUserPreferences(userId) {
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    return data || this.getDefaultPreferences();
  }

  // Get user email
  async getUserEmail(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    return data?.email;
  }

  // Check if current time is in quiet hours
  isQuietHours(preferences) {
    if (!preferences.quiet_hours_enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = preferences.quiet_hours_start.split(':').map(Number);
    const [endHour, endMin] = preferences.quiet_hours_end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  // Remove invalid subscription
  async removeSubscription(subscriptionId) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('id', subscriptionId);
  }

  // Convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Send batch notifications
  async sendBatchNotifications(notifications) {
    const batches = [];
    const batchSize = 100;

    // Group notifications by user to respect preferences
    const userGroups = notifications.reduce((acc, notif) => {
      if (!acc[notif.userId]) acc[notif.userId] = [];
      acc[notif.userId].push(notif);
      return acc;
    }, {});

    // Process each user's notifications
    for (const [userId, userNotifs] of Object.entries(userGroups)) {
      const prefs = await this.getUserPreferences(userId);
      
      // Filter based on preferences
      const filtered = userNotifs.filter(n => {
        const emailPref = prefs[`email_${n.type}`];
        const pushPref = prefs[`push_${n.type}`];
        return emailPref || pushPref;
      });

      // Add to batches
      for (let i = 0; i < filtered.length; i += batchSize) {
        batches.push(filtered.slice(i, i + batchSize));
      }
    }

    // Process batches
    for (const batch of batches) {
      await Promise.all(
        batch.map(notif => 
          this.sendNotification(notif.userId, notif.type, notif.data)
        )
      );
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();