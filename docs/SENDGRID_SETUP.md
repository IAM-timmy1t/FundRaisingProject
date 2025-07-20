# SendGrid Email Setup Guide

## Overview

Blessed Horizon uses SendGrid for production-grade email delivery. This guide walks you through setting up SendGrid for the platform.

## Prerequisites

- SendGrid account (free tier available)
- Verified domain or sender email
- Access to Supabase project settings

## Setup Steps

### 1. Create SendGrid Account

1. Visit [SendGrid.com](https://sendgrid.com) and sign up for a free account
2. Complete email verification
3. Complete account setup wizard

### 2. Verify Your Domain

1. Navigate to **Settings > Sender Authentication**
2. Click **Domain Authentication**
3. Add your domain (e.g., `blessed-horizon.com`)
4. Add the provided DNS records to your domain:
   - CNAME records for email tracking
   - TXT record for domain verification
5. Click **Verify** once DNS propagates

### 3. Create API Key

1. Go to **Settings > API Keys**
2. Click **Create API Key**
3. Name: `blessed-horizon-production`
4. API Key Permissions: **Full Access** (or customize)
5. Copy the API key immediately (shown only once)

### 4. Configure Supabase Environment Variables

#### In Supabase Dashboard:

1. Go to your project settings
2. Navigate to **Edge Functions > Secrets**
3. Add the following environment variables:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=noreply@blessed-horizon.com
FROM_NAME=Blessed Horizon
PUBLIC_URL=https://blessed-horizon.com
```

#### For Local Development:

Create `.env.local` in your project root:

```bash
# SendGrid Configuration
VITE_SENDGRID_API_KEY=your_sendgrid_api_key_here
VITE_FROM_EMAIL=noreply@blessed-horizon.com
VITE_FROM_NAME=Blessed Horizon
VITE_PUBLIC_URL=http://localhost:5173

# Fallback SMTP (for development)
VITE_SMTP_HOST=smtp.gmail.com
VITE_SMTP_PORT=587
VITE_SMTP_USER=your-email@gmail.com
VITE_SMTP_PASS=your-app-password
```

### 5. Set Up Email Templates in SendGrid (Optional)

While our system uses inline templates, you can also create templates in SendGrid:

1. Go to **Email API > Dynamic Templates**
2. Click **Create a Dynamic Template**
3. Name your template (e.g., "Donation Notification")
4. Click **Add Version**
5. Design your template using the editor
6. Note the Template ID for use in code

### 6. Configure Email Activity Tracking

1. Navigate to **Settings > Tracking**
2. Enable:
   - Click Tracking
   - Open Tracking
   - Subscription Tracking
3. Configure unsubscribe preferences

## Email Templates

Our system includes the following email templates:

- **donation** - New donation notifications
- **update** - Campaign update notifications
- **goal-reached** - Goal achievement celebrations
- **campaign-ending** - Campaign deadline reminders
- **trust-score-change** - Trust score updates
- **daily-digest** - Daily activity summary
- **weekly-digest** - Weekly performance report

## Testing Email Delivery

### 1. Test Individual Templates

```javascript
// In browser console or test script
import { emailService } from './src/services/emailService';

// Test donation email
await emailService.sendTestEmail('test@example.com', 'donation');
```

### 2. Test Edge Function Directly

```bash
# Test the send-email Edge Function
curl -X POST https://your-project.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "template": "donation",
    "templateData": {
      "donor_name": "John Doe",
      "amount": 100,
      "campaign_title": "Test Campaign"
    }
  }'
```

### 3. Monitor Email Delivery

1. Check SendGrid Activity Feed: **Activity > Activity Feed**
2. View email statistics: **Stats > Overview**
3. Monitor bounces: **Suppressions > Bounces**

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Verify API key is correct
   - Check SendGrid account is active
   - Ensure sender email is verified

2. **Emails going to spam**
   - Complete domain authentication
   - Set up SPF and DKIM records
   - Avoid spam trigger words

3. **Template rendering issues**
   - Check template data structure
   - Verify Handlebars syntax
   - Test with minimal data first

### Debug Mode

Enable debug logging in Edge Function:

```typescript
const DEBUG = Deno.env.get('DEBUG_EMAIL') === 'true';
if (DEBUG) console.log('Email data:', emailData);
```

## Email Best Practices

1. **Sender Reputation**
   - Always use verified domains
   - Handle bounces promptly
   - Include unsubscribe links

2. **Content Guidelines**
   - Keep subject lines under 50 characters
   - Use preheader text effectively
   - Optimize for mobile devices

3. **Performance**
   - Batch similar emails when possible
   - Use templates for consistency
   - Monitor delivery rates

## Monitoring & Analytics

### Key Metrics to Track

- **Delivery Rate**: Should be >95%
- **Open Rate**: Target 20-30% for transactional
- **Click Rate**: Target 5-10% for engagement
- **Bounce Rate**: Keep below 2%
- **Spam Reports**: Keep below 0.1%

### Set Up Webhooks (Advanced)

1. Go to **Settings > Event Webhooks**
2. Add webhook URL: `https://your-project.supabase.co/functions/v1/email-webhook`
3. Select events to track:
   - Delivered
   - Opened
   - Clicked
   - Bounced
   - Spam Report

## Cost Management

### SendGrid Pricing Tiers

- **Free**: 100 emails/day
- **Essentials**: 50,000 emails/month starting at $19.95
- **Pro**: Advanced features and higher volumes

### Optimization Tips

1. Use email digests to reduce volume
2. Allow users to control notification frequency
3. Monitor usage in SendGrid dashboard
4. Set up billing alerts

## Security Considerations

1. **API Key Security**
   - Never commit API keys to git
   - Use environment variables
   - Rotate keys periodically

2. **Email Validation**
   - Validate email addresses before sending
   - Implement rate limiting
   - Monitor for abuse

3. **Content Security**
   - Sanitize user-generated content
   - Escape HTML in templates
   - Validate template data

## Support Resources

- [SendGrid Documentation](https://docs.sendgrid.com/)
- [SendGrid API Reference](https://docs.sendgrid.com/api-reference/mail-send/mail-send)
- [Email Deliverability Guide](https://sendgrid.com/resource/email-deliverability-guide/)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)

## Next Steps

1. Complete SendGrid setup
2. Test all email templates
3. Monitor delivery metrics
4. Set up email analytics dashboard
5. Configure user preferences UI