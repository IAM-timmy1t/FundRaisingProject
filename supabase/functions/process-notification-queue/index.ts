import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationQueueItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: any;
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get digest type from request (daily, weekly)
    const { digestType = 'daily' } = await req.json();

    // Calculate date range for digest
    const now = new Date();
    const startDate = new Date();
    
    if (digestType === 'daily') {
      startDate.setDate(startDate.getDate() - 1);
    } else if (digestType === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    }

    // Get users with pending notifications and matching digest preferences
    const { data: usersWithNotifications, error: usersError } = await supabase
      .from('notification_queue')
      .select('user_id')
      .eq('sent', false)
      .gte('created_at', startDate.toISOString())
      .order('user_id');

    if (usersError) throw usersError;

    // Get unique user IDs
    const uniqueUserIds = [...new Set(usersWithNotifications?.map(n => n.user_id) || [])];

    // Process each user's notifications
    const results = [];
    
    for (const userId of uniqueUserIds) {
      try {
        // Get user preferences
        const { data: preferences } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

        // Skip if user doesn't want this digest type
        if (preferences?.email_digest !== digestType && 
            !(digestType === 'daily' && preferences?.email_digest === 'instant')) {
          continue;
        }

        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('id', userId)
          .single();

        if (!profile?.email) continue;

        // Get pending notifications for this user
        const { data: notifications } = await supabase
          .from('notification_queue')
          .select('*')
          .eq('user_id', userId)
          .eq('sent', false)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false });

        if (!notifications || notifications.length === 0) continue;

        // Group notifications by type
        const groupedNotifications = notifications.reduce((acc, notif) => {
          if (!acc[notif.type]) acc[notif.type] = [];
          acc[notif.type].push(notif);
          return acc;
        }, {} as Record<string, NotificationQueueItem[]>);

        // Generate digest HTML
        const digestHtml = generateDigestHtml(profile, groupedNotifications, digestType);
        const digestText = generateDigestText(profile, groupedNotifications, digestType);

        // Send digest email
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: profile.email,
            subject: `Your ${digestType} Blessed Horizon digest`,
            html: digestHtml,
            text: digestText
          }
        });

        if (emailError) {
          console.error(`Failed to send digest to ${profile.email}:`, emailError);
          results.push({ userId, success: false, error: emailError.message });
          continue;
        }

        // Mark notifications as sent
        const notificationIds = notifications.map(n => n.id);
        const { error: updateError } = await supabase
          .from('notification_queue')
          .update({ sent: true, sent_at: now.toISOString() })
          .in('id', notificationIds);

        if (updateError) {
          console.error(`Failed to update notifications for ${userId}:`, updateError);
        }

        results.push({ 
          userId, 
          success: true, 
          notificationCount: notifications.length 
        });

      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        results.push({ userId, success: false, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedUsers: results.length,
        results 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Process notification queue error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateDigestHtml(
  profile: UserProfile, 
  groupedNotifications: Record<string, NotificationQueueItem[]>,
  digestType: string
): string {
  const notificationCount = Object.values(groupedNotifications)
    .reduce((sum, notifs) => sum + notifs.length, 0);

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; }
        .section { margin: 20px 0; padding: 15px; border-left: 3px solid #3b82f6; background: #f3f4f6; }
        .notification { margin: 10px 0; padding: 10px; background: white; border-radius: 5px; }
        .cta { display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your ${digestType} Blessed Horizon Digest</h1>
          <p>Hello ${profile.full_name || 'there'}! Here's what you missed:</p>
        </div>
        
        <p>You have <strong>${notificationCount} new notifications</strong> from the past ${digestType === 'daily' ? 'day' : 'week'}.</p>
  `;

  // Add sections for each notification type
  if (groupedNotifications.donations) {
    html += `
      <div class="section">
        <h2>💰 New Donations (${groupedNotifications.donations.length})</h2>
        ${groupedNotifications.donations.map(n => `
          <div class="notification">
            <strong>${n.title}</strong><br>
            ${n.body}
          </div>
        `).join('')}
      </div>
    `;
  }

  if (groupedNotifications.updates) {
    html += `
      <div class="section">
        <h2>📢 Campaign Updates (${groupedNotifications.updates.length})</h2>
        ${groupedNotifications.updates.map(n => `
          <div class="notification">
            <strong>${n.title}</strong><br>
            ${n.body}
          </div>
        `).join('')}
      </div>
    `;
  }

  if (groupedNotifications.goal_reached) {
    html += `
      <div class="section">
        <h2>🎉 Goals Reached (${groupedNotifications.goal_reached.length})</h2>
        ${groupedNotifications.goal_reached.map(n => `
          <div class="notification">
            <strong>${n.title}</strong><br>
            ${n.body}
          </div>
        `).join('')}
      </div>
    `;
  }

  html += `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${Deno.env.get('PUBLIC_URL')}/notifications" class="cta">View All Notifications</a>
        </div>
        
        <div class="footer">
          <p>You're receiving this because you subscribed to ${digestType} email digests.</p>
          <p><a href="${Deno.env.get('PUBLIC_URL')}/settings/notifications">Update your notification preferences</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}

function generateDigestText(
  profile: UserProfile,
  groupedNotifications: Record<string, NotificationQueueItem[]>,
  digestType: string
): string {
  const notificationCount = Object.values(groupedNotifications)
    .reduce((sum, notifs) => sum + notifs.length, 0);

  let text = `Your ${digestType} Blessed Horizon Digest

Hello ${profile.full_name || 'there'}!

You have ${notificationCount} new notifications from the past ${digestType === 'daily' ? 'day' : 'week'}.

`;

  // Add sections for each notification type
  Object.entries(groupedNotifications).forEach(([type, notifications]) => {
    const typeTitle = {
      donations: 'New Donations',
      updates: 'Campaign Updates',
      goal_reached: 'Goals Reached',
      campaign_ending: 'Campaigns Ending Soon',
      trust_changes: 'Trust Score Changes'
    }[type] || type;

    text += `\n${typeTitle} (${notifications.length}):\n`;
    text += '=' '.repeat(30) + '\n';

    notifications.forEach(n => {
      text += `\n${n.title}\n${n.body}\n`;
    });
  });

  text += `\n\nView all notifications: ${Deno.env.get('PUBLIC_URL')}/notifications
Update your preferences: ${Deno.env.get('PUBLIC_URL')}/settings/notifications`;

  return text;
}
