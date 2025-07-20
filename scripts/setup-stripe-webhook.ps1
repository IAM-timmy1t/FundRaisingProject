# Stripe Webhook Setup Script
# Run this in PowerShell to set up Stripe webhooks for local development

Write-Host "🚀 Stripe Webhook Setup for Blessed-Horizon" -ForegroundColor Cyan
Write-Host ""

# Check if Stripe CLI is installed
try {
    $stripeVersion = stripe version 2>$null
    Write-Host "✅ Stripe CLI found: $stripeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Stripe CLI not found. Installing..." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Stripe CLI first:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://github.com/stripe/stripe-cli/releases/latest" -ForegroundColor White
    Write-Host "2. Extract and add to PATH" -ForegroundColor White
    Write-Host "3. Or use Scoop: scoop install stripe" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Login to Stripe
Write-Host ""
Write-Host "📝 Step 1: Login to Stripe" -ForegroundColor Yellow
Write-Host "A browser window will open for authentication..." -ForegroundColor Gray
stripe login

# Get Supabase project URL
Write-Host ""
Write-Host "📝 Step 2: Enter your Supabase project details" -ForegroundColor Yellow
$supabaseUrl = Read-Host "Enter your Supabase URL (e.g., https://yjskofrahipwryyhsxrc.supabase.co)"

# Start webhook forwarding
Write-Host ""
Write-Host "📝 Step 3: Starting webhook forwarding..." -ForegroundColor Yellow
Write-Host "Keep this window open while testing!" -ForegroundColor Red
Write-Host ""

# Construct the webhook URL
$webhookUrl = "$supabaseUrl/functions/v1/stripe-webhook"

Write-Host "Forwarding webhooks to: $webhookUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚡ IMPORTANT: Copy the webhook signing secret (starts with whsec_) shown below" -ForegroundColor Yellow
Write-Host "   and add it to your .env.local file as STRIPE_WEBHOOK_SECRET" -ForegroundColor Yellow
Write-Host ""

# Start listening
stripe listen --forward-to $webhookUrl --events payment_intent.succeeded,payment_intent.payment_failed,charge.refunded
