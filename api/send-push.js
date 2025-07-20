import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configure web-push
webpush.setVapidDetails(
  'mailto:support@fundraising.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function POST(req) {
  try {
    const { subscription, notification } = await req.json();

    if (!subscription || !notification) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send push notification
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icon-192x192.png',
      badge: notification.badge || '/badge-72x72.png',
      data: notification.data || {},
      actions: notification.actions || [],
      tag: notification.tag || 'default',
      requireInteraction: notification.requireInteraction || false,
      silent: notification.silent || false,
      vibrate: notification.vibrate || [200, 100, 200]
    });

    await webpush.sendNotification(subscription, payload);

    return new Response(
      JSON.stringify({ success: true, message: 'Push notification sent' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Push notification error:', error);
    
    // Handle specific errors
    if (error.statusCode === 410) {
      return new Response(
        JSON.stringify({ error: 'Subscription expired', code: 'EXPIRED' }),
        { status: 410, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Endpoint to check for pending notifications
export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check for pending notifications in queue
    const { data: notifications, error } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('user_id', user.id)
      .eq('sent', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    // Mark as sent
    if (notifications && notifications.length > 0) {
      const ids = notifications.map(n => n.id);
      await supabase
        .from('notification_queue')
        .update({ sent: true, sent_at: new Date().toISOString() })
        .in('id', ids);
    }

    return new Response(
      JSON.stringify(notifications || []),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
