@echo off
echo.
echo =====================================
echo  Stripe Webhook Setup - Quick Start
echo =====================================
echo.

REM Check if Stripe CLI is available
stripe version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Stripe CLI not found!
    echo.
    echo Please install Stripe CLI first:
    echo 1. Download: https://github.com/stripe/stripe-cli/releases/latest
    echo 2. Extract stripe.exe to a folder in your PATH
    echo 3. Or use Scoop: scoop install stripe
    echo.
    pause
    exit /b 1
)

echo Step 1: Login to Stripe (browser will open)
echo ----------------------------------------
stripe login
echo.

echo Step 2: Start webhook forwarding
echo ----------------------------------------
echo.
echo Your Supabase URL: https://yjskofrahipwryyhsxrc.supabase.co
echo.
echo IMPORTANT: When the webhook starts, copy the webhook signing secret
echo           (starts with whsec_) and add it to your .env.local file
echo.
pause
echo.

REM Start webhook forwarding
stripe listen --forward-to https://yjskofrahipwryyhsxrc.supabase.co/functions/v1/stripe-webhook --events payment_intent.succeeded,payment_intent.payment_failed,charge.refunded
