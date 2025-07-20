# Notification System Architecture

## Overview

The Blessed Horizon notification system is a comprehensive, multi-channel communication platform that keeps users informed about campaign activities through email, push notifications, and in-app notifications.

## System Components

### 1. Core Services

#### NotificationService (`src/services/notificationService.js`)
- Central orchestrator for all notifications
- Manages push subscriptions
- Handles user preferences
- Routes notifications to appropriate channels

#### EmailService (`src/services/emailService.js`)
- Dedicated service for email notifications
- Template management
- SendGrid/SMTP integration
- Batch email processing

### 2. Edge Functions

#### send-email (`supabase/functions/send-email/`)
- Processes email requests
- Renders Handlebars templates
- Integrates with SendGrid API
- Falls back to SMTP when needed

#### process-notification-queue (`supabase/functions/process-notification-queue/`)
- Processes digest emails (daily/weekly)
- Aggregates notifications
- Respects user preferences
- Handles batch processing

### 3. Database Schema

#### notification_preferences
```sql
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY,
  email_donations BOOLEAN DEFAULT true,
  email_updates BOOLEAN DEFAULT true,
  email_goal_reached BOOLEAN DEFAULT true,
  email_campaign_ending BOOLEAN DEFAULT true,
  email_trust_changes BOOLEAN DEFAULT false,
  email_digest TEXT DEFAULT 'daily',
  push_donations BOOLEAN DEFAULT true,
  push_updates BOOLEAN DEFAULT true,
  push_goal_reached BOOLEAN DEFAULT true,
  push_campaign_ending BOOLEAN DEFAULT true,
  push_trust_changes BOOLEAN DEFAULT false,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### notification_queue
```sql
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### notification_history
```sql
CREATE TABLE notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  body TEXT,
  data JSONB,
  channel TEXT[], -- ['email', 'push', 'in-app']
  sent_at TIMESTAMP DEFAULT NOW()
);
```

#### push_subscriptions
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);
```

## Notification Types

### 1. Donations
- **Trigger**: New donation received
- **Recipients**: Campaign owner
- **Channels**: Email, Push
- **Urgency**: High

### 2. Updates
- **Trigger**: Campaign update posted
- **Recipients**: All donors
- **Channels**: Email, Push
- **Urgency**: Medium

### 3. Goal Reached
- **Trigger**: Campaign reaches funding goal
- **Recipients**: Campaign owner + all donors
- **Channels**: Email, Push
- **Urgency**: High

### 4. Campaign Ending
- **Trigger**: 48 hours before deadline
- **Recipients**: Followers + potential donors
- **Channels**: Email, Push
- **Urgency**: High

### 5. Trust Score Changes
- **Trigger**: Significant score change (±5 points)
- **Recipients**: User whose score changed
- **Channels**: Email, Push (if enabled)
- **Urgency**: Low

## Email Templates

### Template Structure
```
base.html (wrapper)
├── donation.html
├── update.html
├── goal-reached.html
├── campaign-ending.html
├── trust-score-change.html
├── daily-digest.html
└── weekly-digest.html
```

### Template Features
- Responsive design
- Handlebars templating
- Dynamic content
- Tracking pixels
- Unsubscribe links
- Social sharing buttons

## Notification Flow

### Instant Notifications
```
Event Trigger
    ↓
NotificationService.sendNotification()
    ↓
Check User Preferences
    ├── Email Channel
    │   ├── Check digest preference
    │   ├── If instant → Send immediately
    │   └── If digest → Queue for later
    └── Push Channel
        ├── Check quiet hours
        ├── Get subscriptions
        └── Send to all devices
```

### Digest Notifications
```
Scheduled Job (Daily/Weekly)
    ↓
process-notification-queue Function
    ↓
Query notification_queue
    ↓
Group by user
    ↓
Check user preferences
    ↓
Generate digest email
    ↓
Mark as sent
```

## User Preferences

### Email Preferences
- **Instant**: Receive immediately
- **Daily**: Daily digest at 9 AM
- **Weekly**: Weekly digest on Mondays
- **Never**: No email notifications

### Push Preferences
- Enable/disable by notification type
- Quiet hours configuration
- Device management

### Preference UI
```javascript
// Settings page structure
/settings/notifications
  ├── Email Notifications
  │   ├── Toggle by type
  │   └── Digest frequency
  ├── Push Notifications
  │   ├── Toggle by type
  │   └── Quiet hours
  └── Notification History
```

## Implementation Details

### SendGrid Integration

```javascript
// Environment variables
SENDGRID_API_KEY=SG.xxxx
FROM_EMAIL=noreply@blessed-horizon.com
FROM_NAME=Blessed Horizon
```

### Push Notification Setup

```javascript
// Service Worker Registration
navigator.serviceWorker.register('/sw.js')

// Push Subscription
pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: VAPID_PUBLIC_KEY
})
```

### Email Tracking

```javascript
// SendGrid tracking settings
tracking_settings: {
  click_tracking: { enable: true },
  open_tracking: { enable: true }
}

// Custom arguments for analytics
customArgs: {
  campaign_id: 'abc123',
  notification_type: 'donation'
}
```

## Performance Optimizations

### 1. Template Caching
- Compile Handlebars templates once
- Store in memory cache
- Invalidate on deployment

### 2. Batch Processing
- Group emails by template type
- Use SendGrid batch API
- Process up to 1000 emails per request

### 3. Queue Management
- Process digests in background
- Retry failed sends
- Exponential backoff

### 4. Database Indexes
```sql
CREATE INDEX idx_queue_user_sent ON notification_queue(user_id, sent);
CREATE INDEX idx_queue_created ON notification_queue(created_at);
CREATE INDEX idx_history_user ON notification_history(user_id);
```

## Monitoring & Analytics

### Key Metrics
- Delivery rate (>98%)
- Open rate (>25%)
- Click rate (>5%)
- Unsubscribe rate (<1%)
- Push subscription rate
- Preference opt-out rates

### Monitoring Tools
- SendGrid Analytics Dashboard
- Custom Supabase dashboards
- Error tracking (Sentry)
- Performance monitoring

## Security Considerations

### 1. Authentication
- Verify user ownership before sending
- Validate email addresses
- Rate limiting per user

### 2. Privacy
- Encrypt push subscription keys
- Honor unsubscribe immediately
- GDPR compliance
- Data retention policies

### 3. Anti-Spam
- Domain authentication (SPF, DKIM)
- Proper unsubscribe headers
- Content filtering
- Bounce handling

## Testing Strategy

### Unit Tests
- Template rendering
- Preference logic
- Queue processing

### Integration Tests
- Email delivery
- Push notifications
- Database operations

### E2E Tests
- Full notification flow
- User preference updates
- Digest generation

## Future Enhancements

### Phase 1 (Current)
- ✅ Email notifications
- ✅ Push notifications
- ✅ User preferences
- ✅ Digest emails

### Phase 2 (Planned)
- SMS notifications (Twilio)
- WhatsApp integration
- In-app notification center
- Rich push notifications

### Phase 3 (Future)
- AI-powered send time optimization
- Notification bundling
- Cross-channel orchestration
- Advanced analytics

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check SendGrid API key
   - Verify domain authentication
   - Check spam folder

2. **Push not working**
   - Verify service worker
   - Check VAPID keys
   - Test browser support

3. **Digest not processing**
   - Check cron job
   - Verify queue entries
   - Check user preferences

### Debug Commands

```sql
-- Check pending notifications
SELECT * FROM notification_queue WHERE sent = false;

-- Check user preferences
SELECT * FROM notification_preferences WHERE user_id = ?;

-- Check push subscriptions
SELECT * FROM push_subscriptions WHERE user_id = ?;
```