import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { supabase } from '../src/config/supabase.js';
import { notificationService } from '../src/services/notificationService.js';

// Test notification system
async function testNotificationSystem() {
  console.log('🔔 Testing Notification System...\n');

  try {
    // 1. Test database tables
    console.log('1️⃣ Testing database tables...');
    
    const tables = [
      'push_subscriptions',
      'notification_preferences', 
      'notification_history',
      'notification_queue'
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (error) {
        console.error(`❌ Table ${table} check failed:`, error.message);
      } else {
        console.log(`✅ Table ${table} exists and is accessible`);
      }
    }

    // 2. Test notification service initialization
    console.log('\n2️⃣ Testing notification service...');
    
    const initialized = await notificationService.initialize();
    console.log(`${initialized ? '✅' : '❌'} Notification service initialization`);

    // 3. Test user preferences
    console.log('\n3️⃣ Testing user preferences...');
    
    // Get test user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('⚠️  No authenticated user found. Please log in first.');
      return;
    }

    const preferences = await notificationService.loadUserPreferences();
    console.log('✅ User preferences loaded:', preferences ? 'Found' : 'Using defaults');

    // 4. Test notification creation
    console.log('\n4️⃣ Testing notification creation...');
    
    const testNotification = {
      user_id: user.id,
      type: 'donations',
      title: 'Test Donation Notification',
      body: 'This is a test notification from the testing script',
      data: {
        campaign_id: 'test-campaign',
        donation_id: 'test-donation',
        amount: '$100'
      }
    };

    const { data: notification, error: notifError } = await supabase
      .from('notification_history')
      .insert(testNotification)
      .select()
      .single();

    if (notifError) {
      console.error('❌ Failed to create notification:', notifError.message);
    } else {
      console.log('✅ Test notification created:', notification.id);
      
      // Clean up
      await supabase
        .from('notification_history')
        .delete()
        .eq('id', notification.id);
    }

    // 5. Test email function
    console.log('\n5️⃣ Testing email configuration...');
    
    const emailConfig = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_USER: process.env.SMTP_USER,
      VAPID_PUBLIC_KEY: process.env.VITE_VAPID_PUBLIC_KEY
    };

    const missingConfigs = Object.entries(emailConfig)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingConfigs.length > 0) {
      console.warn('⚠️  Missing email configurations:', missingConfigs.join(', '));
    } else {
      console.log('✅ Email configuration complete');
    }

    // 6. Test notification formatting
    console.log('\n6️⃣ Testing notification formatting...');
    
    const types = ['donations', 'updates', 'goal_reached', 'campaign_ending', 'trust_changes'];
    
    for (const type of types) {
      const formatted = notificationService.formatNotification(type, {
        donor_name: 'Test User',
        amount: '$100',
        campaign_title: 'Test Campaign',
        campaign_id: 'test-123',
        update_title: 'Test Update',
        goal_amount: '$1000',
        current_amount: '$500',
        percentage: 50,
        time_left: '24 hours',
        old_score: 80,
        new_score: 85,
        change: 5,
        reason: 'Successful campaign'
      });
      
      console.log(`✅ ${type}: ${formatted.push?.title || 'No title'}`);
    }

    console.log('\n✨ Notification system test complete!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }

  process.exit(0);
}

// Run the test
testNotificationSystem();
