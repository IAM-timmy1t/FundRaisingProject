# Stripe Webhook Setup with Live Keys
# Uses your specific Stripe CLI path

$stripePath = "Z:\.CodingProjects\GitHub_Repos\stripe_1.28.0_windows_x86_64\stripe.exe"
$supabaseUrl = "https://yjskofrahipwryyhsxrc.supabase.co"

Write-Host "`n🚀 STRIPE WEBHOOK SETUP (LIVE MODE)" -ForegroundColor Red
Write-Host "==================================`n" -ForegroundColor Red

Write-Host "⚠️  WARNING: You are using LIVE Stripe keys!" -ForegroundColor Yellow
Write-Host "   Real payments will be processed!`n" -ForegroundColor Yellow

# Check if Stripe CLI exists at the path
if (Test-Path $stripePath) {
    Write-Host "✅ Stripe CLI found at: $stripePath`n" -ForegroundColor Green
} else {
    Write-Host "❌ Stripe CLI not found at: $stripePath" -ForegroundColor Red
    exit 1
}

# Login to Stripe
Write-Host "📝 Step 1: Login to Stripe (if needed)..." -ForegroundColor Yellow
Write-Host "Browser will open for authentication`n" -ForegroundColor Gray
& $stripePath login

Write-Host "`n📝 Step 2: Starting webhook listener..." -ForegroundColor Yellow
Write-Host "=====================================`n" -ForegroundColor Yellow

Write-Host "🔑 IMPORTANT: Copy the webhook signing secret when it appears!" -ForegroundColor Red
Write-Host "   It will look like: whsec_xxxxxxxxxxxxxxxxxxxxx`n" -ForegroundColor Red

Write-Host "Webhook endpoint: $supabaseUrl/functions/v1/stripe-webhook`n" -ForegroundColor Cyan

Write-Host "Press Enter to start the webhook listener..." -ForegroundColor Yellow
Read-Host

# Start the webhook listener
Write-Host "`n🎯 Starting webhook forwarding...`n" -ForegroundColor Green
Write-Host "Keep this window open during testing!`n" -ForegroundColor Red

& $stripePath listen --forward-to "$supabaseUrl/functions/v1/stripe-webhook" --events payment_intent.succeeded,payment_intent.payment_failed,charge.refunded

# Note: In production, you'll set up the webhook in Stripe Dashboard instead
