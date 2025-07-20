# 🚀 Get Your Webhook Secret - Quick Instructions

## Run this PowerShell command:

```powershell
# Navigate to project directory
cd Z:\.CodingProjects\GitHub_Repos\FundRaisingProject

# Run the webhook setup script
.\scripts\get-webhook-secret-live.ps1
```

## What will happen:

1. **Stripe Login**: A browser window will open for authentication (if not already logged in)
2. **Webhook Listener Starts**: The CLI will start forwarding webhooks to your Supabase function
3. **Copy the Secret**: You'll see output like this:
   ```
   > Ready! Your webhook signing secret is whsec_1234567890abcdef... (^C to quit)
   ```
4. **Update .env.local**: Add the webhook secret:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
   ```

## Important Notes:

- **Keep the terminal open** while testing payments
- You're using **LIVE keys** - be careful with real card numbers!
- For production, you'll configure webhooks in Stripe Dashboard instead

## After Getting the Secret:

1. Update your `.env.local` with the webhook secret
2. Set Supabase secrets:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_YOUR_KEY
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
   ```
3. Deploy the edge functions:
   ```bash
   supabase functions deploy create-payment-intent
   supabase functions deploy stripe-webhook
   ```

## Test with LIVE mode test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
