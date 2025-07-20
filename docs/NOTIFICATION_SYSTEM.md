# Push Notification System

This document describes the comprehensive push notification system implemented for the FundRaising Platform.

## Features

### 1. Browser Push Notifications
- Real-time push notifications to user devices
- Service Worker implementation for background notifications
- Offline support with notification sync
- Click handling to navigate to relevant pages

### 2. Email Notifications  
- Transactional emails via Supabase Edge Functions
- Email digest options (instant, daily, weekly)
- Rich HTML email templates
- SMTP integration support

### 3. Notification Types
- **New Donations**: Alert when someone donates to a campaign
- **Campaign Updates**: Notifications for new campaign updates
- **Goal Reached**: Celebrate when campaigns reach funding goals
- **Campaign Ending**: Reminders for campaigns ending soon
- **Trust Score Changes**: Updates about trust score modifications

### 4. User Preferences
- Granular control over notification types
- Separate settings for push and email notifications
- Quiet hours configuration
- Email digest frequency settings

### 5. Notification Management
- Notification history tracking
- Mark as read/unread functionality
- Bulk actions (mark all as read)
- Search and filter capabilities
- Delete unwanted notifications

## Setup Instructions

### 1. Generate VAPID Keys
```bash
npm install -g web-push
node scripts/generate-vapid-keys.js
```

Add the generated keys to your `.env` file:
```env
VITE_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
```

### 2. Configure Email Service
Add SMTP settings to your `.env` file:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password
FROM_EMAIL=noreply@fundraising.com
FROM_NAME=FundRaising Platform
```

### 3. Deploy Supabase Edge Function
```bash
supabase functions deploy send-email
```

### 4. Run Database Migrations
```bash
supabase db push
```

### 5. Configure Service Worker
The service worker is automatically registered when the app loads. Ensure `sw.js` is in your public directory.

## Usage

### For Users
1. Click the bell icon in the header to view notifications
2. Click "Enable Notifications" when prompted
3. Access notification preferences via Settings > Notifications
4. Configure email and push preferences
5. Set quiet hours if desired

### For Developers

#### Send a notification:
```javascript
import { notificationService } from '@/services/notificationService';

// Send notification to a user
await notificationService.sendNotification(
  userId,
  'donations', // notification type
  {
    donor_name: 'John Doe',
    amount: '$100',
    campaign_title: 'Help Build a School',
    campaign_id: 'campaign-123',
    donation_id: 'donation-456'
  }
);
```

#### Batch notifications:
```javascript
// Send multiple notifications efficiently
await notificationService.sendBatchNotifications([
  {
    userId: 'user-1',
    type: 'updates',
    data: { /* update data */ }
  },
  {
    userId: 'user-2',
    type: 'goal_reached',
    data: { /* goal data */ }
  }
]);
```

## Architecture

### Components
- `NotificationBell.jsx`: Header notification icon with dropdown
- `NotificationPreferences.jsx`: User preferences management UI
- `NotificationsPage.jsx`: Full notification history page

### Services
- `notificationService.js`: Core notification logic and API
- `realtimeService.js`: Real-time notification delivery

### Hooks
- `useNotifications.js`: React hook for notification management

### Database Tables
- `push_subscriptions`: Browser push subscription data
- `notification_preferences`: User notification settings
- `notification_history`: All sent notifications
- `notification_queue`: Pending digest notifications

## Security Considerations

1. **Authentication**: All notification endpoints require authentication
2. **Row Level Security**: Users can only access their own notifications
3. **VAPID Keys**: Public key is safe to expose, private key must remain secret
4. **Email Security**: Use app-specific passwords, never store plain credentials

## Troubleshooting

### Push notifications not working:
1. Check browser compatibility (Chrome, Firefox, Edge supported)
2. Ensure HTTPS is enabled (required for service workers)
3. Verify VAPID keys are correctly configured
4. Check browser notification permissions

### Email notifications not sending:
1. Verify SMTP credentials
2. Check Supabase Edge Function logs
3. Ensure email preferences are enabled
4. Check spam folder

### Service Worker issues:
1. Clear browser cache and reload
2. Check console for service worker errors
3. Ensure sw.js is accessible at root path
4. Verify manifest.json is properly linked

## Future Enhancements

1. **SMS Notifications**: Add Twilio integration
2. **In-App Notifications**: Real-time toast notifications
3. **Notification Templates**: Customizable email templates
4. **Analytics**: Track notification engagement
5. **A/B Testing**: Test different notification strategies
6. **Rich Notifications**: Add images and action buttons
7. **Notification Scheduling**: Time-based notifications
8. **Localization**: Multi-language notification support
