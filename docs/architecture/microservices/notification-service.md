# Notification Service Specification

## Service Overview

The Notification Service handles all communication channels for the Blessed-Horizon platform, including email, push notifications, and in-app notifications.

## Architecture

### Technology Stack
- **Framework**: FastAPI 0.104+
- **Database**: PostgreSQL 15+ for notification storage
- **Queue**: RabbitMQ for message routing
- **Cache**: Redis for delivery status
- **Email Provider**: SendGrid/AWS SES
- **Push Provider**: Firebase Cloud Messaging
- **SMS Provider**: Twilio (future)

### Service Dependencies
- User Service (user preferences)
- Campaign Service (campaign events)
- Payment Service (transaction notifications)
- Trust Score Service (score changes)

## API Specification

### Send Notification
```http
POST /api/v1/notifications/send
Content-Type: application/json
Authorization: Bearer {token}

{
  "recipient_id": "uuid",
  "type": "campaign_update",
  "channels": ["email", "push", "in_app"],
  "template": "campaign_update_posted",
  "data": {
    "campaign_title": "Help Build Water Wells",
    "update_title": "Construction Started!",
    "campaign_id": "uuid"
  },
  "priority": "normal",
  "schedule_at": null
}

Response:
{
  "notification_id": "uuid",
  "status": "queued",
  "channels_queued": ["email", "push", "in_app"],
  "estimated_delivery": "2024-01-15T10:31:00Z"
}
```

### Notification Templates

#### Email Templates
```yaml
campaign_update_posted:
  subject: "New update from {{campaign_title}}"
  preview: "{{update_title}}"
  body: |
    <h2>{{update_title}}</h2>
    <p>{{update_excerpt}}</p>
    <a href="{{campaign_url}}">View Full Update</a>

donation_received:
  subject: "Thank you for your donation to {{campaign_title}}"
  preview: "Your ${{amount}} donation is making a difference"
  body: |
    <h2>Thank you for your generosity!</h2>
    <p>Your donation of ${{amount}} to {{campaign_title}} has been received.</p>
    <p>Receipt: {{receipt_url}}</p>

campaign_milestone:
  subject: "{{campaign_title}} reached {{percentage}}% of goal!"
  preview: "Amazing progress thanks to supporters like you"
  body: |
    <h2>Milestone Reached!</h2>
    <p>{{campaign_title}} has raised ${{amount_raised}} of the ${{goal}} goal.</p>
```

#### Push Notification Templates
```yaml
campaign_update_posted:
  title: "{{campaign_title}}"
  body: "New update: {{update_title}}"
  data:
    type: "campaign_update"
    campaign_id: "{{campaign_id}}"
    update_id: "{{update_id}}"

donation_received:
  title: "Donation Confirmed"
  body: "Your ${{amount}} donation to {{campaign_title}} was successful"
  data:
    type: "donation"
    donation_id: "{{donation_id}}"
```

### Get User Notifications
```http
GET /api/v1/notifications/user/{user_id}?page=1&limit=20&unread_only=false
Authorization: Bearer {token}

Response:
{
  "notifications": [
    {
      "id": "uuid",
      "type": "campaign_update",
      "title": "New update from Help Build Water Wells",
      "message": "Construction Started!",
      "data": {
        "campaign_id": "uuid",
        "update_id": "uuid"
      },
      "read": false,
      "created_at": "2024-01-15T10:30:00Z",
      "read_at": null,
      "channels_delivered": ["in_app", "push"],
      "action_url": "/campaigns/uuid/updates/uuid"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "unread_count": 12
  }
}
```

### Update Notification Preferences
```http
POST /api/v1/notifications/preferences
Content-Type: application/json
Authorization: Bearer {token}

{
  "user_id": "uuid",
  "preferences": {
    "email": {
      "enabled": true,
      "frequency": "immediate",
      "types": {
        "campaign_updates": true,
        "donation_confirmations": true,
        "weekly_digest": true,
        "marketing": false
      }
    },
    "push": {
      "enabled": true,
      "quiet_hours": {
        "enabled": true,
        "start": "22:00",
        "end": "08:00",
        "timezone": "America/New_York"
      },
      "types": {
        "campaign_updates": true,
        "donation_confirmations": true,
        "urgent_updates": true
      }
    },
    "in_app": {
      "enabled": true,
      "types": {
        "all": true
      }
    }
  }
}

Response:
{
  "user_id": "uuid",
  "preferences_updated": true,
  "updated_at": "2024-01-15T10:35:00Z"
}
```

### Subscribe to Push Notifications
```http
POST /api/v1/notifications/subscribe
Content-Type: application/json
Authorization: Bearer {token}

{
  "user_id": "uuid",
  "device_token": "FCM_TOKEN_HERE",
  "device_type": "web",
  "device_info": {
    "browser": "Chrome",
    "version": "120.0",
    "os": "Windows"
  }
}

Response:
{
  "subscription_id": "uuid",
  "device_registered": true,
  "topics_subscribed": [
    "user_uuid",
    "campaign_updates_uuid"
  ]
}
```

## Database Schema

### notifications
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    priority VARCHAR(20) DEFAULT 'normal',
    channels TEXT[] NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
```

### notification_deliveries
```sql
CREATE TABLE notification_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id),
    channel VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    provider_message_id VARCHAR(255),
    delivered_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB
);

CREATE INDEX idx_deliveries_notification ON notification_deliveries(notification_id);
CREATE INDEX idx_deliveries_status ON notification_deliveries(status);
```

### user_preferences
```sql
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    email_enabled BOOLEAN DEFAULT TRUE,
    email_frequency VARCHAR(20) DEFAULT 'immediate',
    email_types JSONB DEFAULT '{"all": true}'::jsonb,
    push_enabled BOOLEAN DEFAULT TRUE,
    push_quiet_hours JSONB,
    push_types JSONB DEFAULT '{"all": true}'::jsonb,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    in_app_types JSONB DEFAULT '{"all": true}'::jsonb,
    unsubscribe_token VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### device_tokens
```sql
CREATE TABLE device_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    token TEXT NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    device_info JSONB,
    active BOOLEAN DEFAULT TRUE,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_device_tokens_unique ON device_tokens(user_id, token);
```

## Notification Processing

### Message Flow
```python
class NotificationProcessor:
    async def process_notification(self, notification: NotificationRequest):
        # 1. Validate recipient and preferences
        user = await self.get_user(notification.recipient_id)
        preferences = await self.get_preferences(user.id)
        
        # 2. Filter channels based on preferences
        active_channels = self.filter_channels(
            notification.channels,
            preferences,
            notification.type
        )
        
        # 3. Create notification record
        db_notification = await self.create_notification_record(
            user_id=user.id,
            type=notification.type,
            data=notification.data,
            channels=active_channels
        )
        
        # 4. Queue delivery for each channel
        for channel in active_channels:
            await self.queue_delivery(
                notification_id=db_notification.id,
                channel=channel,
                user=user,
                notification=notification
            )
        
        return db_notification
```

### Email Delivery
```python
class EmailDeliveryHandler:
    def __init__(self):
        self.sendgrid = SendGridAPIClient(api_key=SENDGRID_API_KEY)
        
    async def deliver(self, delivery: NotificationDelivery):
        notification = delivery.notification
        user = delivery.user
        
        # Load template
        template = self.load_template(notification.template)
        
        # Render content
        subject = self.render_template(template.subject, notification.data)
        html_body = self.render_template(template.body, notification.data)
        
        # Send email
        message = Mail(
            from_email=('notifications@blessed-horizon.com', 'Blessed Horizon'),
            to_emails=user.email,
            subject=subject,
            html_content=html_body
        )
        
        # Add unsubscribe link
        message.add_substitution('-unsubscribe_url-', 
            f"{BASE_URL}/unsubscribe/{user.unsubscribe_token}")
        
        try:
            response = self.sendgrid.send(message)
            await self.mark_delivered(
                delivery_id=delivery.id,
                provider_message_id=response.headers['X-Message-Id']
            )
        except Exception as e:
            await self.mark_failed(delivery.id, str(e))
            if delivery.retry_count < 3:
                await self.schedule_retry(delivery.id)
```

### Push Notification Delivery
```python
class PushDeliveryHandler:
    def __init__(self):
        cred = credentials.Certificate('firebase-credentials.json')
        firebase_admin.initialize_app(cred)
        
    async def deliver(self, delivery: NotificationDelivery):
        notification = delivery.notification
        devices = await self.get_user_devices(delivery.user_id)
        
        for device in devices:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=notification.title,
                    body=notification.message
                ),
                data=notification.data,
                token=device.token,
                android=messaging.AndroidConfig(
                    priority='high',
                    notification=messaging.AndroidNotification(
                        click_action='FLUTTER_NOTIFICATION_CLICK'
                    )
                ),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            sound='default',
                            badge=await self.get_unread_count(delivery.user_id)
                        )
                    )
                )
            )
            
            try:
                response = messaging.send(message)
                await self.mark_delivered(
                    delivery_id=delivery.id,
                    provider_message_id=response
                )
            except messaging.UnregisteredError:
                await self.deactivate_device(device.id)
            except Exception as e:
                await self.handle_push_error(delivery.id, device.id, e)
```

## Notification Types

### Campaign Notifications
- `campaign_created` - New campaign launched
- `campaign_update` - Campaign update posted
- `campaign_milestone` - Milestone reached (25%, 50%, 75%, 100%)
- `campaign_ending_soon` - Campaign ending in 24 hours
- `campaign_completed` - Campaign successfully completed

### Donation Notifications
- `donation_received` - Donation confirmation
- `donation_receipt` - Tax receipt available
- `recurring_donation_processed` - Monthly donation processed
- `payment_failed` - Payment failure notification

### Trust Score Notifications
- `trust_score_increased` - Trust score improved
- `trust_score_decreased` - Trust score decreased
- `verification_completed` - Account verification done

### System Notifications
- `welcome` - Welcome to platform
- `account_security` - Security-related notifications
- `platform_updates` - New features/updates
- `maintenance` - Scheduled maintenance

## Performance Optimization

### Batching
```python
class BatchProcessor:
    async def process_digest_emails(self):
        """
        Process daily/weekly digest emails
        """
        users = await self.get_digest_subscribers('weekly')
        
        for batch in chunks(users, 100):
            notifications = []
            for user in batch:
                content = await self.generate_digest_content(user)
                notifications.append({
                    'user_id': user.id,
                    'template': 'weekly_digest',
                    'data': content
                })
            
            await self.send_batch_emails(notifications)
```

### Rate Limiting
```python
class RateLimiter:
    def __init__(self):
        self.redis = Redis()
        
    async def check_rate_limit(self, user_id: str, channel: str) -> bool:
        key = f"rate_limit:{channel}:{user_id}"
        count = await self.redis.incr(key)
        
        if count == 1:
            await self.redis.expire(key, 3600)  # 1 hour window
            
        limits = {
            'email': 10,
            'push': 50,
            'sms': 5
        }
        
        return count <= limits.get(channel, 100)
```

## Monitoring

### Metrics
- Delivery success rate by channel
- Average delivery time
- Bounce/failure rates
- Unsubscribe rates
- Click-through rates
- Device token churn

### Alerts
- Delivery failure rate > 5%
- Email bounce rate > 2%
- Queue backlog > 1000 messages
- Provider API errors

### Health Checks
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "providers": {
            "sendgrid": check_sendgrid_api(),
            "fcm": check_fcm_connection(),
            "database": check_database(),
            "queue": check_rabbitmq()
        },
        "queue_depth": get_queue_depth(),
        "delivery_rate": get_delivery_rate()
    }
```

## Security & Privacy

### Data Protection
- PII encrypted at rest
- TLS for all external APIs
- Audit logs for all operations
- GDPR compliance for EU users

### Unsubscribe Handling
```python
@app.get("/unsubscribe/{token}")
async def unsubscribe(token: str):
    user = await get_user_by_unsubscribe_token(token)
    if not user:
        raise HTTPException(404, "Invalid unsubscribe link")
    
    # Show preferences page
    return templates.TemplateResponse(
        "unsubscribe.html",
        {"request": request, "user": user, "token": token}
    )

@app.post("/unsubscribe/{token}")
async def process_unsubscribe(token: str, preferences: dict):
    user = await get_user_by_unsubscribe_token(token)
    await update_preferences(user.id, preferences)
    
    # Log unsubscribe event
    await log_event("unsubscribe", {
        "user_id": user.id,
        "channels": preferences.get("disabled_channels", [])
    })
```