# Automated Stripe Webhook Setup for Blessed-Horizon
# This script will help you get your webhook secret automatically

$ErrorActionPreference = "Stop"

Write-Host "`n🔧 STRIPE WEBHOOK SETUP HELPER" -ForegroundColor Cyan
Write-Host "==============================`n" -ForegroundColor Cyan

# Warning about live key
Write-Host "⚠️  WARNING: You currently have a LIVE Stripe key in your .env.local!" -ForegroundColor Red
Write-Host "   Please ensure you're using TEST keys for development.`n" -ForegroundColor Yellow

# Check for Stripe CLI
try {
    $null = stripe version 2>&1
    Write-Host "✅ Stripe CLI detected`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Stripe CLI not found!`n" -ForegroundColor Red
    Write-Host "To install Stripe CLI:" -ForegroundColor Yellow
    Write-Host "1. Using Chocolatey: choco install stripe-cli" -ForegroundColor White
    Write-Host "2. Using Scoop: scoop install stripe" -ForegroundColor White
    Write-Host "3. Manual: Download from https://github.com/stripe/stripe-cli/releases`n" -ForegroundColor White
    
    $install = Read-Host "Would you like to open the download page? (y/n)"
    if ($install -eq 'y') {
        Start-Process "https://github.com/stripe/stripe/stripe-cli/releases/latest"
    }
    exit 1
}

# Auto-detect Supabase URL from .env.local
$envPath = "Z:\.CodingProjects\GitHub_Repos\FundRaisingProject\.env.local"
$supabaseUrl = "https://yjskofrahipwryyhsxrc.supabase.co"

Write-Host "📍 Using Supabase URL: $supabaseUrl" -ForegroundColor Cyan
Write-Host "📍 Webhook endpoint: $supabaseUrl/functions/v1/stripe-webhook`n" -ForegroundColor Cyan

# Login to Stripe if needed
Write-Host "📝 Step 1: Logging into Stripe..." -ForegroundColor Yellow
try {
    stripe config --list | Out-Null
    Write-Host "✅ Already logged in to Stripe`n" -ForegroundColor Green
} catch {
    Write-Host "Browser will open for authentication...`n" -ForegroundColor Gray
    stripe login
}

# Create the webhook listener command
$webhookCommand = "stripe listen --forward-to $supabaseUrl/functions/v1/stripe-webhook --events payment_intent.succeeded,payment_intent.payment_failed,charge.refunded"

Write-Host "`n📝 Step 2: Starting webhook listener..." -ForegroundColor Yellow
Write-Host "=========================================`n" -ForegroundColor Yellow

Write-Host "⚡ IMPORTANT INSTRUCTIONS:" -ForegroundColor Red
Write-Host "1. When the webhook starts, you'll see a line that says:" -ForegroundColor White
Write-Host "   'Your webhook signing secret is whsec_...'" -ForegroundColor Gray
Write-Host "2. Copy the entire whsec_ key" -ForegroundColor White
Write-Host "3. Add it to your .env.local file as:" -ForegroundColor White
Write-Host "   STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE`n" -ForegroundColor Gray

Write-Host "4. Also update your Supabase Edge Function secrets:" -ForegroundColor White
Write-Host "   supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_KEY" -ForegroundColor Gray
Write-Host "   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET`n" -ForegroundColor Gray

Write-Host "Press Enter to start the webhook listener..." -ForegroundColor Yellow
Read-Host

Write-Host "`n🚀 Starting webhook listener...`n" -ForegroundColor Green
Write-Host "Keep this window open while testing payments!`n" -ForegroundColor Red

# Execute the webhook listener
Invoke-Expression $webhookCommand
