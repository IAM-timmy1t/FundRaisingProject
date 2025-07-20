# Push Notification Setup Guide

This guide will help you set up push notifications for the Blessed-Horizon fundraising platform.

## Table of Contents
1. [Overview](#overview)
2. [VAPID Keys Generation](#vapid-keys-generation)
3. [Environment Configuration](#environment-configuration)
4. [Service Worker Setup](#service-worker-setup)
5. [Frontend Integration](#frontend-integration)
6. [Backend Integration](#backend-integration)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

## Overview

Push notifications in Blessed-Horizon use the Web Push Protocol with VAPID (Voluntary Application Server Identification) authentication. This ensures secure, reliable delivery of notifications to users' browsers.

### Key Components:
- **Service Worker** (`/public/sw.js`) - Handles push events and displays notifications
- **Notification Service** - Manages subscriptions and sends notifications
- **Edge Function** (`send-push`) - Sends push notifications via Web Push Protocol
- **UI Components** - Settings and notification bell for user interaction

## VAPID Keys Generation

VAPID keys are required for authenticating your server with push services.

### Option 1: Using Node.js web-push library

```bash
npm install -g web-push
web-push generate-vapid-keys
```

### Option 2: Using online generator
Visit: https://vapidkeys.com/

### Option 3: Using Node.js script

Create a file `generate-vapid-keys.js`:

```javascript
const webpush = require('web-push');
const vapidKeys = webpush.generateVAPIDKeys();

console.log('VAPID Public Key:', vapidKeys.publicKey);
console.log('VAPID Private Key:', vapidKeys.privateKey);
```

Run:
```bash
npm install web-push
node generate-vapid-keys.js
```

## Environment Configuration

### 1. Frontend Environment (.env.local)

Add the following to your `.env.local` file:

```env
# Push Notification Configuration
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key_here
```

### 2. Supabase Edge Function Environment

Set the following environment variables in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to Settings → Edge Functions
3. Add the following secrets:

```env
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
VAPID_SUBJECT=mailto:support@blessedhorizon.org
```

## Service Worker Setup

The service worker is already configured at `/public/sw.js`. It handles:

- Push event reception
- Notification display
- Click event handling
- Offline caching
- Background sync

### Key Features:

1. **Push Event Handler**
   - Receives push payloads
   - Displays notifications with custom options
   - Supports action buttons

2. **Click Handler**
   - Routes users to relevant pages
   - Handles notification actions
   - Focuses existing windows or opens new ones

3. **Background Sync**
   - Queues failed notifications
   - Retries when connection restored

## Frontend Integration

### 1. Register Service Worker

The service worker is registered in `notificationService.js`:

```javascript
// Automatic registration on initialization
await navigator.serviceWorker.register('/sw.js');
```

### 2. Request Permission

Users must grant permission for notifications:

```javascript
const permission = await Notification.requestPermission();
if (permission === 'granted') {
  // Subscribe to push notifications
}
```

### 3. Subscribe to Push

After permission is granted:

```javascript
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
});
```

### 4. UI Components

**NotificationBell Component**
- Shows unread count
- Displays recent notifications
- Quick actions (mark read, delete)

**NotificationSettings Component**
- Toggle notification types
- Set delivery preferences
- Configure quiet hours

## Backend Integration

### 1. Database Schema

The following tables manage push notifications:

- `push_subscriptions` - Stores user push endpoints
- `notification_preferences` - User notification settings
- `notification_history` - Sent notifications log
- `notification_queue` - Queued notifications for digests

### 2. Sending Notifications

Use the `notificationService` to send notifications:

```javascript
// Send a donation notification
await notificationService.sendNotification(
  userId,
  'donations',
  {
    donor_name: 'John Doe',
    amount: '$100',
    campaign_title: 'Help Build a School',
    campaign_id: 'campaign-123',
    donation_id: 'donation-456'
  }
);
```

### 3. Notification Types

Supported notification types:
- `donations` - New donation received
- `updates` - Campaign update posted
- `goal_reached` - Campaign goal achieved
- `campaign_ending` - Campaign ending soon
- `trust_changes` - Trust score changed

## Testing

### 1. Test Push Notifications

Use the test button in NotificationSettings:

```javascript
await sendTestNotification();
```

### 2. Browser DevTools

1. Open Chrome DevTools
2. Go to Application → Service Workers
3. Check "Update on reload"
4. Test push events manually

### 3. Notification Debugging

```javascript
// Enable verbose logging
localStorage.setItem('debug:notifications', 'true');
```

### 4. Edge Function Testing

Test the Edge Function locally:

```bash
supabase functions serve send-push
```

Send a test request:

```bash
curl -X POST http://localhost:54321/functions/v1/send-push \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "subscription": {
      "endpoint": "https://fcm.googleapis.com/fcm/send/...",
      "keys": {
        "p256dh": "...",
        "auth": "..."
      }
    },
    "notification": {
      "title": "Test Notification",
      "body": "This is a test",
      "icon": "/icon-192x192.png"
    }
  }'
```

## Troubleshooting

### Common Issues

1. **"Push notifications not supported"**
   - Ensure HTTPS is enabled
   - Check browser compatibility
   - Verify service worker registration

2. **"Permission denied"**
   - User must manually enable in browser settings
   - Cannot re-request if previously denied

3. **"Invalid VAPID key"**
   - Verify key format (base64url)
   - Ensure public/private key match
   - Check environment variables

4. **"Subscription failed"**
   - Clear browser cache
   - Re-register service worker
   - Check VAPID key configuration

5. **"Notifications not appearing"**
   - Check notification permissions
   - Verify service worker is active
   - Check browser notification settings

### Debug Checklist

- [ ] HTTPS enabled (required for service workers)
- [ ] Service worker registered successfully
- [ ] Notification permission granted
- [ ] VAPID keys properly configured
- [ ] Push subscription saved to database
- [ ] Edge Function deployed and accessible
- [ ] Notification preferences enabled

### Browser Support

Push notifications are supported in:
- Chrome 50+
- Firefox 44+
- Safari 16+ (macOS/iOS)
- Edge 17+

Not supported in:
- Internet Explorer
- Some mobile browsers in power-saving mode
- Private/Incognito mode (limited support)

## Security Considerations

1. **VAPID Keys**
   - Keep private key secure
   - Never expose in frontend code
   - Rotate keys periodically

2. **Content Security**
   - Sanitize notification content
   - Validate user permissions
   - Rate limit notification sending

3. **Privacy**
   - Respect user preferences
   - Implement unsubscribe mechanisms
   - Log minimal user data

## Next Steps

1. Test notifications across different browsers
2. Monitor delivery rates and failures
3. Implement notification analytics
4. Add rich notification features (images, actions)
5. Set up notification campaigns

For additional support, consult the [Web Push Protocol documentation](https://developers.google.com/web/ilt/pwa/introduction-to-push-notifications) or contact the development team.