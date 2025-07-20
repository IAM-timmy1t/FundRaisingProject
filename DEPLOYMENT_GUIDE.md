# 🚀 Stripe Integration Deployment Guide

## ✅ Current Status
- **Webhook Secret**: Successfully obtained and added to `.env.local`
- **Stripe Keys**: LIVE keys configured (be careful with real payments!)
- **Edge Functions**: Ready to deploy

## 📋 Manual Deployment Steps

### 1. Install Supabase CLI (if not installed)
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
supabase login
```

### 3. Link Your Project
```bash
supabase link --project-ref yjskofrahipwryyhsxrc
```

### 4. Set Supabase Secrets
```bash
# Set the Stripe secret key (using restricted key for security)
supabase secrets set STRIPE_SECRET_KEY=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

# Set the webhook secret
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_8ca14e638df8f304f94f76b0bbefd2019fc280653738964b4ffe629dd56a825c
```

### 5. Deploy Edge Functions
```bash
# Deploy payment intent creation function
supabase functions deploy create-payment-intent

# Deploy webhook handler function
supabase functions deploy stripe-webhook
```

### 6. Verify Deployment
```bash
# List deployed functions
supabase functions list
```

## 🧪 Testing the Integration

1. **Keep Stripe CLI Running**: The webhook listener must be active
   ```bash
   stripe listen --forward-to https://yjskofrahipwryyhsxrc.supabase.co/functions/v1/stripe-webhook
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Test a Donation**:
   - Navigate to any campaign
   - Click "Donate Now"
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date and any CVC

## ⚠️ IMPORTANT NOTES

- **LIVE MODE**: You're using LIVE Stripe keys - real money will be charged!
- **Webhook Secret**: Keep it secure, never commit to git
- **Restricted Key**: Using `rk_live_` key for enhanced security
- **Monitoring**: Check Stripe Dashboard for webhook events

## 🔍 Troubleshooting

### If webhook events fail:
1. Check Stripe CLI is still running
2. Verify webhook secret matches in Supabase
3. Check function logs: `supabase functions logs stripe-webhook`

### If payments fail:
1. Check browser console for errors
2. Verify publishable key in frontend
3. Check function logs: `supabase functions logs create-payment-intent`

## 📊 Next Steps

Once deployment is complete, you can:
1. Process real donations
2. Track payments in Stripe Dashboard
3. Monitor webhook events
4. View donation records in Supabase

---

**Support**: If you encounter issues, check:
- Stripe Dashboard: https://dashboard.stripe.com/
- Supabase Dashboard: https://app.supabase.com/project/yjskofrahipwryyhsxrc
