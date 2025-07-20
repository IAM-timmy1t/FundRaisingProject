# Quick Database Setup Commands
# Run these in your terminal after applying migrations via Supabase Dashboard

Write-Host "📦 Blessed-Horizon Database Setup Helper" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Test if Supabase CLI is working
Write-Host "`nTesting Supabase CLI..." -ForegroundColor Yellow
$supabaseVersion = supabase --version 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Supabase CLI is installed: $supabaseVersion" -ForegroundColor Green
    
    Write-Host "`nTry these commands:" -ForegroundColor Yellow
    Write-Host "1. supabase login" -ForegroundColor White
    Write-Host "2. supabase link --project-ref yjskofrahipwryyhsxrc" -ForegroundColor White
    Write-Host "3. supabase db push" -ForegroundColor White
} else {
    Write-Host "❌ Supabase CLI not working properly" -ForegroundColor Red
    Write-Host "`nPlease use the Supabase Dashboard instead:" -ForegroundColor Yellow
    Write-Host "https://app.supabase.com/project/yjskofrahipwryyhsxrc/sql" -ForegroundColor White
}

Write-Host "`n📝 Manual Steps Required:" -ForegroundColor Yellow
Write-Host "1. Open Supabase Dashboard SQL Editor" -ForegroundColor White
Write-Host "2. Copy contents of: supabase\combined-migrations.sql" -ForegroundColor White
Write-Host "3. Paste and run in SQL Editor" -ForegroundColor White
Write-Host "4. Create storage buckets in Storage section" -ForegroundColor White

Write-Host "`n🧪 After applying migrations, test with:" -ForegroundColor Yellow
Write-Host "npm run dev" -ForegroundColor White
Write-Host "Then open browser console and paste test-database.js contents" -ForegroundColor White

Write-Host "`n📚 Documentation:" -ForegroundColor Yellow
Write-Host "- Migration Instructions: MIGRATION_INSTRUCTIONS.md" -ForegroundColor White
Write-Host "- Project Status: PROJECT_STATUS.md" -ForegroundColor White
Write-Host "- Quick Start: QUICK_START.md" -ForegroundColor White
