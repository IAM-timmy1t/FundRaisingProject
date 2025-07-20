# Deploy Donation System Migration

Write-Host "🚀 Deploying Donation System..." -ForegroundColor Cyan

# Check if supabase is installed
try {
    $supabaseVersion = npx supabase --version
    Write-Host "✅ Supabase CLI found: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI not found. Installing..." -ForegroundColor Red
    npm install -g supabase
}

# Get project root
$projectRoot = "Z:\.CodingProjects\GitHub_Repos\FundRaisingProject"
Set-Location $projectRoot

Write-Host "`n📊 Running database migration..." -ForegroundColor Yellow

# Run the new migration
try {
    npx supabase migration up --db-url "postgresql://postgres.yjskofrahipwryyhsxrc:YourSupabasePassword@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
    Write-Host "✅ Database migration completed!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Migration failed. You can run it manually from Supabase Dashboard" -ForegroundColor Yellow
    Write-Host "    Go to: https://app.supabase.com/project/yjskofrahipwryyhsxrc/database/migrations" -ForegroundColor White
}

Write-Host "`n🔄 Re-deploying Edge Functions with updates..." -ForegroundColor Yellow

# Deploy updated create-payment-intent function
try {
    npx supabase functions deploy create-payment-intent --project-ref yjskofrahipwryyhsxrc
    Write-Host "✅ Payment intent function updated!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Function deployment failed. Deploy from dashboard if needed." -ForegroundColor Yellow
}

Write-Host "`n✨ Donation system deployment complete!" -ForegroundColor Green
Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Test a donation on a campaign" -ForegroundColor White
Write-Host "2. Verify donation appears in database" -ForegroundColor White
Write-Host "3. Check Stripe dashboard for payment" -ForegroundColor White
Write-Host "4. Confirm webhook updates donation status" -ForegroundColor White

Write-Host "`n🔗 Useful Links:" -ForegroundColor Cyan
Write-Host "- Supabase Dashboard: https://app.supabase.com/project/yjskofrahipwryyhsxrc" -ForegroundColor White
Write-Host "- Stripe Dashboard: https://dashboard.stripe.com/" -ForegroundColor White
Write-Host "- Local Dev: http://localhost:5173" -ForegroundColor White
