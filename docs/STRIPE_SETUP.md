# Stripe Payment Integration Setup Guide

This guide will help you set up Stripe payment processing for the Blessed-Horizon platform.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Access to Stripe Dashboard
3. Stripe CLI (for webhook testing)

## Setup Steps

### 1. Get Your Stripe API Keys

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Toggle to **Test mode** (switch in the top-right corner)
3. Navigate to **Developers > API keys**
4. Copy your test keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### 2. Update Environment Variables

Update your `.env.local` file with your Stripe keys:

```env
# Replace with your actual Stripe test keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY_HERE
```

### 3. Set Up Webhook Endpoint

#### Option A: Using Stripe CLI (Recommended for Local Development)

1. Install Stripe CLI:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Windows (using scoop)
   scoop install stripe

   # Or download from https://stripe.com/docs/stripe-cli
   ```

2. Login to Stripe CLI:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local Supabase functions:
   ```bash
   stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
   ```

4. Copy the webhook signing secret (starts with `whsec_`) and add to `.env.local`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
   ```

#### Option B: Production Webhook Setup

1. In Stripe Dashboard, go to **Developers > Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL: `https://YOUR-SUPABASE-PROJECT.supabase.co/functions/v1/stripe-webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy the signing secret and add to your Supabase Edge Function secrets

### 4. Deploy Edge Functions

Deploy the payment edge functions to Supabase:

```bash
# Deploy create-payment-intent function
supabase functions deploy create-payment-intent

# Deploy stripe-webhook function
supabase functions deploy stripe-webhook
```

### 5. Set Edge Function Secrets

Set the required secrets for your edge functions:

```bash
# Set Stripe secret key
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY

# Set webhook secret
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

### 6. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to a campaign and click "Donate"
3. Use Stripe test cards:
   - **Success**: 4242 4242 4242 4242
   - **Decline**: 4000 0000 0000 0002
   - **3D Secure**: 4000 0025 0000 3155

## Stripe Test Cards

| Card Number | Scenario |
|------------|----------|
| 4242 4242 4242 4242 | Successful payment |
| 4000 0000 0000 0002 | Card declined |
| 4000 0025 0000 3155 | 3D Secure authentication |
| 4000 0000 0000 9995 | Insufficient funds |
| 4000 0000 0000 0069 | Expired card |
| 4100 0000 0000 0019 | Blocked card |

Use any future expiry date and any 3-digit CVC.

## Troubleshooting

### Payment Intent Creation Fails
- Check that your Stripe secret key is correctly set in edge function secrets
- Verify the campaign exists and is in "FUNDING" status
- Check Supabase function logs: `supabase functions logs create-payment-intent`

### Webhook Not Receiving Events
- Ensure Stripe CLI is running with `--forward-to` flag
- Verify webhook secret is correctly set
- Check webhook logs in Stripe Dashboard

### Payment Succeeds but Campaign Not Updated
- Check webhook function logs: `supabase functions logs stripe-webhook`
- Verify database permissions for the service role
- Ensure webhook events are being forwarded correctly

## Going to Production

1. Switch to live mode in Stripe Dashboard
2. Get production API keys
3. Update environment variables with production keys
4. Set up production webhook endpoint
5. Update Supabase edge function secrets with production values
6. Test with real payment methods (small amounts)

## Fee Structure

The platform currently charges:
- **Stripe Processing Fee**: 2.9% + 30¢ (paid to Stripe)
- **Platform Fee**: 2% (kept by Blessed-Horizon)
- **Net to Campaign**: ~95% of donation amount

You can adjust the platform fee in `create-payment-intent/index.ts`.

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Validate all amounts** on the server side
4. **Use webhook signatures** to verify Stripe events
5. **Implement rate limiting** for payment endpoints
6. **Monitor for suspicious activity** in Stripe Dashboard

## Support

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
