#!/usr/bin/env pwsh
# Deploy Stripe Functions to Supabase

Write-Host "🚀 Deploying Stripe Functions to Supabase" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Cyan

# Change to project directory
Set-Location "Z:\.CodingProjects\GitHub_Repos\FundRaisingProject"

# Step 1: Set Supabase Secrets
Write-Host "`n📝 Step 1: Setting Supabase Secrets..." -ForegroundColor Yellow

# Note: Using the LIVE restricted key (rk_live) for security
$stripe_secret = "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"
$webhook_secret = "whsec_8ca14e638df8f304f94f76b0bbefd2019fc280653738964b4ffe629dd56a825c"

Write-Host "Setting STRIPE_SECRET_KEY..." -ForegroundColor Cyan
& supabase secrets set STRIPE_SECRET_KEY=$stripe_secret

Write-Host "Setting STRIPE_WEBHOOK_SECRET..." -ForegroundColor Cyan
& supabase secrets set STRIPE_WEBHOOK_SECRET=$webhook_secret

# Step 2: Deploy Edge Functions
Write-Host "`n📦 Step 2: Deploying Edge Functions..." -ForegroundColor Yellow

Write-Host "Deploying create-payment-intent function..." -ForegroundColor Cyan
& supabase functions deploy create-payment-intent

Write-Host "Deploying stripe-webhook function..." -ForegroundColor Cyan
& supabase functions deploy stripe-webhook

# Step 3: Verify Deployment
Write-Host "`n✅ Step 3: Verifying Deployment..." -ForegroundColor Yellow

Write-Host "Listing deployed functions..." -ForegroundColor Cyan
& supabase functions list

Write-Host "`n🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "`n📌 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Keep the Stripe CLI webhook listener running in another terminal"
Write-Host "2. Test a donation on your local dev server"
Write-Host "3. Check the webhook events in the Stripe Dashboard"
Write-Host "`n⚠️  IMPORTANT: You're using LIVE Stripe keys - real money will be charged!" -ForegroundColor Red
