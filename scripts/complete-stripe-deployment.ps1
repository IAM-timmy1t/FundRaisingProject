#!/usr/bin/env pwsh
# Stripe Deployment Script for Blessed-Horizon
# This script completes the Stripe integration deployment

Write-Host "🚀 Blessed-Horizon Stripe Deployment Script" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
$currentPath = Get-Location
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Not in project directory!" -ForegroundColor Red
    Write-Host "Please run this script from: Z:\.CodingProjects\GitHub_Repos\FundRaisingProject" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Current directory: $currentPath" -ForegroundColor Green
Write-Host ""

# Function to run command and check result
function Run-Command {
    param(
        [string]$Command,
        [string]$Description
    )
    
    Write-Host "🔧 $Description..." -ForegroundColor Yellow
    Write-Host "   Command: $Command" -ForegroundColor DarkGray
    
    try {
        $result = Invoke-Expression $Command 2>&1
        if ($LASTEXITCODE -eq 0 -or $null -eq $LASTEXITCODE) {
            Write-Host "   ✅ Success!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "   ❌ Failed with exit code: $LASTEXITCODE" -ForegroundColor Red
            Write-Host "   Error: $result" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "   ❌ Error: $_" -ForegroundColor Red
        return $false
    }
}

# Step 1: Check Node.js
Write-Host "📋 Step 1: Checking Node.js installation..." -ForegroundColor Cyan
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "   ✅ Node.js found: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "   ❌ Node.js not found!" -ForegroundColor Red
    Write-Host "   Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check/Install Supabase CLI
Write-Host "`n📋 Step 2: Checking Supabase CLI..." -ForegroundColor Cyan
$supabaseVersion = supabase --version 2>$null
if ($supabaseVersion) {
    Write-Host "   ✅ Supabase CLI found: $supabaseVersion" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Supabase CLI not found. Installing..." -ForegroundColor Yellow
    if (Run-Command "npm install -g supabase" "Installing Supabase CLI globally") {
        Write-Host "   ✅ Supabase CLI installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "   Trying with npx instead..." -ForegroundColor Yellow
        $useNpx = $true
    }
}

# Determine command prefix
$supabaseCmd = if ($useNpx) { "npx supabase" } else { "supabase" }

# Step 3: Login to Supabase
Write-Host "`n📋 Step 3: Logging in to Supabase..." -ForegroundColor Cyan
Write-Host "   You may need to authenticate in your browser." -ForegroundColor Yellow
if (-not (Run-Command "$supabaseCmd login" "Logging in to Supabase")) {
    Write-Host "   ⚠️  Login may have failed. Continuing anyway..." -ForegroundColor Yellow
}

# Step 4: Link Project
Write-Host "`n📋 Step 4: Linking Supabase project..." -ForegroundColor Cyan
if (Run-Command "$supabaseCmd link --project-ref yjskofrahipwryyhsxrc" "Linking project") {
    Write-Host "   ✅ Project linked successfully!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Project may already be linked. Continuing..." -ForegroundColor Yellow
}

# Step 5: Set Secrets
Write-Host "`n📋 Step 5: Setting Supabase secrets..." -ForegroundColor Cyan
Write-Host "   ⚠️  Using LIVE Stripe keys - be careful!" -ForegroundColor Red

$secrets = @{
    "STRIPE_SECRET_KEY" = "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"
    "STRIPE_WEBHOOK_SECRET" = "whsec_8ca14e638df8f304f94f76b0bbefd2019fc280653738964b4ffe629dd56a825c"
}

foreach ($secret in $secrets.GetEnumerator()) {
    if (Run-Command "$supabaseCmd secrets set $($secret.Key)=$($secret.Value)" "Setting $($secret.Key)") {
        Write-Host "   ✅ $($secret.Key) set successfully!" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Failed to set $($secret.Key)" -ForegroundColor Red
        $hasErrors = $true
    }
}

# Step 6: Deploy Edge Functions
Write-Host "`n📋 Step 6: Deploying Edge Functions..." -ForegroundColor Cyan
$functions = @(
    "create-payment-intent",
    "stripe-webhook"
)

foreach ($function in $functions) {
    if (Run-Command "$supabaseCmd functions deploy $function" "Deploying $function") {
        Write-Host "   ✅ $function deployed successfully!" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Failed to deploy $function" -ForegroundColor Red
        $hasErrors = $true
    }
}

# Step 7: Verify Deployment
Write-Host "`n📋 Step 7: Verifying deployment..." -ForegroundColor Cyan
if (Run-Command "$supabaseCmd functions list" "Listing deployed functions") {
    Write-Host "   ✅ Functions listed successfully!" -ForegroundColor Green
}

# Final Summary
Write-Host "`n==========================================" -ForegroundColor Cyan
if ($hasErrors) {
    Write-Host "⚠️  Deployment completed with some errors" -ForegroundColor Yellow
    Write-Host "Please check the errors above and try manual deployment for failed items." -ForegroundColor Yellow
} else {
    Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
}

Write-Host "`n📌 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Ensure Stripe CLI webhook listener is running:" -ForegroundColor White
Write-Host "   stripe listen --forward-to https://yjskofrahipwryyhsxrc.supabase.co/functions/v1/stripe-webhook" -ForegroundColor Gray
Write-Host "2. Start your development server:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host "3. Test a donation on any campaign" -ForegroundColor White
Write-Host "4. Monitor webhook events in Stripe Dashboard" -ForegroundColor White
Write-Host "`n⚠️  REMINDER: You're using LIVE Stripe keys!" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Cyan
