# 🚀 Manual Stripe Deployment Guide

If the automated script doesn't work, follow these manual steps:

## Option 1: Using Supabase Dashboard (Easiest)

### 1. Set Secrets via Dashboard
1. Go to: https://app.supabase.com/project/yjskofrahipwryyhsxrc/settings/vault
2. Click "New secret"
3. Add these secrets:
   - Name: `STRIPE_SECRET_KEY`
   - Value: `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`
4. Add another secret:
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_8ca14e638df8f304f94f76b0bbefd2019fc280653738964b4ffe629dd56a825c`

### 2. Deploy Functions via Dashboard
1. Go to: https://app.supabase.com/project/yjskofrahipwryyhsxrc/functions
2. Click "Deploy function"
3. Select your local functions:
   - `supabase/functions/create-payment-intent`
   - `supabase/functions/stripe-webhook`
4. Deploy each one

## Option 2: Using Command Line (If Node.js works)

### 1. Open Command Prompt or PowerShell
```bash
cd Z:\.CodingProjects\GitHub_Repos\FundRaisingProject
```

### 2. Install Supabase CLI
```bash
# Try npm first
npm install -g supabase

# Or use npx (no installation needed)
npx supabase --version
```

### 3. Login to Supabase
```bash
# Using npm-installed version
supabase login

# Or using npx
npx supabase login
```

### 4. Link Your Project
```bash
supabase link --project-ref yjskofrahipwryyhsxrc
# Or: npx supabase link --project-ref yjskofrahipwryyhsxrc
```

### 5. Set Secrets
```bash
# Set Stripe secret key
supabase secrets set STRIPE_SECRET_KEY=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

# Set webhook secret
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_8ca14e638df8f304f94f76b0bbefd2019fc280653738964b4ffe629dd56a825c
```

### 6. Deploy Functions
```bash
# Deploy payment intent function
supabase functions deploy create-payment-intent

# Deploy webhook handler
supabase functions deploy stripe-webhook

# Verify deployment
supabase functions list
```

## Option 3: Quick Test Without Full Deployment

If you want to test locally first:

1. Create `.env` file in `supabase/functions`:
```env
STRIPE_SECRET_KEY=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
STRIPE_WEBHOOK_SECRET=whsec_8ca14e638df8f304f94f76b0bbefd2019fc280653738964b4ffe629dd56a825c
```

2. Serve functions locally:
```bash
supabase functions serve
```

3. Update your frontend to use local functions:
```javascript
// In src/lib/stripe.js, temporarily change:
const FUNCTION_URL = 'http://localhost:54321/functions/v1'
```

## 🧪 Testing Your Integration

### Keep Stripe CLI Running
In a separate terminal:
```bash
cd Z:\.CodingProjects\GitHub_Repos\stripe_1.28.0_windows_x86_64
./stripe listen --forward-to https://yjskofrahipwryyhsxrc.supabase.co/functions/v1/stripe-webhook
```

### Test Flow
1. Start dev server: `npm run dev`
2. Navigate to any campaign
3. Click "Donate Now"
4. Enter amount and card details:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
5. Complete donation
6. Check:
   - Stripe Dashboard for payment
   - Webhook events in CLI
   - Database for donation record

## 🔧 Troubleshooting

### If secrets don't work:
- Check Supabase Dashboard > Settings > Vault
- Ensure no extra spaces in secret values
- Try re-deploying functions after setting secrets

### If functions won't deploy:
- Check you're logged in: `supabase status`
- Ensure project is linked: `supabase db remote list`
- Try deploying via Dashboard

### If payments fail:
- Check browser console for errors
- Verify publishable key in frontend
- Check function logs: `supabase functions logs create-payment-intent`

## 📞 Support Resources

- Supabase Dashboard: https://app.supabase.com/project/yjskofrahipwryyhsxrc
- Stripe Dashboard: https://dashboard.stripe.com/
- Function Logs: https://app.supabase.com/project/yjskofrahipwryyhsxrc/logs/edge-functions
- Webhook Events: https://dashboard.stripe.com/webhooks

## ⚠️ Important Reminders

1. **LIVE MODE**: You're using LIVE Stripe keys!
2. **Webhook Listener**: Must be running for webhooks to work
3. **Security**: Never commit secrets to git
4. **Monitoring**: Check Stripe Dashboard for real transactions
