#!/usr/bin/env pwsh
# Quick Stripe Integration Test Script

Write-Host "🧪 Testing Stripe Integration" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Cyan

# Test 1: Check environment variables
Write-Host "`n📋 Test 1: Checking environment variables..." -ForegroundColor Yellow
$envFile = Get-Content ".env.local" -Raw
if ($envFile -match "STRIPE_WEBHOOK_SECRET=whsec_") {
    Write-Host "   ✅ Webhook secret found in .env.local" -ForegroundColor Green
} else {
    Write-Host "   ❌ Webhook secret missing in .env.local" -ForegroundColor Red
}

if ($envFile -match "VITE_STRIPE_PUBLISHABLE_KEY=pk_live_") {
    Write-Host "   ✅ Publishable key found (LIVE mode)" -ForegroundColor Green
    Write-Host "   ⚠️  Using LIVE keys - real money!" -ForegroundColor Red
} else {
    Write-Host "   ❌ Publishable key missing" -ForegroundColor Red
}

# Test 2: Check Stripe CLI
Write-Host "`n📋 Test 2: Checking Stripe CLI..." -ForegroundColor Yellow
$stripePath = "Z:\.CodingProjects\GitHub_Repos\stripe_1.28.0_windows_x86_64\stripe.exe"
if (Test-Path $stripePath) {
    Write-Host "   ✅ Stripe CLI found" -ForegroundColor Green
    $stripeVersion = & $stripePath --version 2>$null
    Write-Host "   Version: $stripeVersion" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Stripe CLI not found at expected path" -ForegroundColor Red
}

# Test 3: Check Edge Functions
Write-Host "`n📋 Test 3: Checking Edge Functions..." -ForegroundColor Yellow
$functions = @("create-payment-intent", "stripe-webhook")
foreach ($func in $functions) {
    $funcPath = "supabase\functions\$func\index.ts"
    if (Test-Path $funcPath) {
        Write-Host "   ✅ $func function exists" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $func function missing" -ForegroundColor Red
    }
}

# Test 4: Check Frontend Integration
Write-Host "`n📋 Test 4: Checking Frontend Integration..." -ForegroundColor Yellow
$componentsToCheck = @{
    "PaymentPage.jsx" = "src\components\views\PaymentPage.jsx"
    "PaymentSuccessPage.jsx" = "src\components\views\PaymentSuccessPage.jsx"
    "PaymentFailurePage.jsx" = "src\components\views\PaymentFailurePage.jsx"
    "stripe.js" = "src\lib\stripe.js"
}

foreach ($component in $componentsToCheck.GetEnumerator()) {
    if (Test-Path $component.Value) {
        Write-Host "   ✅ $($component.Key) exists" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $($component.Key) missing" -ForegroundColor Red
    }
}

# Test 5: Check Database Schema
Write-Host "`n📋 Test 5: Checking Database Schema..." -ForegroundColor Yellow
$donationsTablePath = "supabase\migrations\003_donations_and_updates.sql"
if (Test-Path $donationsTablePath) {
    $content = Get-Content $donationsTablePath -Raw
    if ($content -match "payment_intent_id") {
        Write-Host "   ✅ Donations table has payment_intent_id column" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Donations table may need payment_intent_id column" -ForegroundColor Yellow
    }
}

# Summary
Write-Host "`n============================" -ForegroundColor Cyan
Write-Host "📊 Test Summary:" -ForegroundColor Green
Write-Host "If all tests passed, your Stripe integration is ready!" -ForegroundColor White
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Run the deployment script: .\scripts\complete-stripe-deployment.ps1" -ForegroundColor White
Write-Host "2. Or follow the manual guide: MANUAL_DEPLOYMENT_GUIDE.md" -ForegroundColor White
Write-Host "3. Keep Stripe CLI webhook listener running" -ForegroundColor White
Write-Host "4. Test a donation on your local server" -ForegroundColor White
