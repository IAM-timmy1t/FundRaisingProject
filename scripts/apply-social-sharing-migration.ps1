# Apply Social Sharing Features Migration
# Task #22: Enable viral campaign sharing across social platforms

# Set variables
$MIGRATION_FILE = "022_social_sharing_features.sql"
$MIGRATION_PATH = Join-Path $PSScriptRoot "..\supabase\migrations\$MIGRATION_FILE"

Write-Host "🚀 Applying Social Sharing Features Migration..." -ForegroundColor Cyan
Write-Host "📄 Migration file: $MIGRATION_FILE" -ForegroundColor Yellow

# Check if migration file exists
if (-not (Test-Path $MIGRATION_PATH)) {
    Write-Host "❌ Migration file not found: $MIGRATION_PATH" -ForegroundColor Red
    exit 1
}

# Load environment variables
$envPath = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
}

$SUPABASE_DB_URL = $env:SUPABASE_DB_URL
if (-not $SUPABASE_DB_URL) {
    Write-Host "❌ SUPABASE_DB_URL not found in environment variables" -ForegroundColor Red
    Write-Host "Please ensure your .env file contains SUPABASE_DB_URL" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n📋 Migration Summary:" -ForegroundColor Cyan
Write-Host "- Creates campaign_shares table for tracking social shares" -ForegroundColor White
Write-Host "- Creates share_conversions table for tracking share-to-donation conversions" -ForegroundColor White
Write-Host "- Creates campaign_milestones table for share milestones" -ForegroundColor White
Write-Host "- Creates share_rewards table for tracking unlocked rewards" -ForegroundColor White
Write-Host "- Creates embed_analytics table for tracking embed usage" -ForegroundColor White
Write-Host "- Creates campaign_sessions table for referral tracking" -ForegroundColor White
Write-Host "- Adds social sharing fields to campaigns table" -ForegroundColor White
Write-Host "- Creates functions for share tracking and viral coefficient calculation" -ForegroundColor White
Write-Host "- Sets up RLS policies for secure access" -ForegroundColor White
Write-Host "- Creates campaign_share_stats view for analytics" -ForegroundColor White

Write-Host "`n⚡ Applying migration..." -ForegroundColor Yellow

try {
    # Read migration content
    $migrationContent = Get-Content $MIGRATION_PATH -Raw

    # Apply migration using psql
    $migrationContent | psql $SUPABASE_DB_URL --set ON_ERROR_STOP=1 2>&1 | Out-String

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Migration applied successfully!" -ForegroundColor Green
        
        Write-Host "`n📊 Verifying migration..." -ForegroundColor Cyan
        
        # Verify tables were created
        $verifyQuery = @"
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'campaign_shares',
    'share_conversions',
    'campaign_milestones',
    'share_rewards',
    'embed_analytics',
    'campaign_sessions'
)
ORDER BY table_name;
"@
        
        $tables = $verifyQuery | psql $SUPABASE_DB_URL -t -A 2>&1
        
        if ($tables -match 'campaign_shares') {
            Write-Host "✅ Tables created successfully:" -ForegroundColor Green
            $tables -split "`n" | Where-Object { $_ } | ForEach-Object {
                Write-Host "   - $_" -ForegroundColor White
            }
        }
        
        Write-Host "`n🎉 Social Sharing Features migration complete!" -ForegroundColor Green
        Write-Host "`n📝 Next Steps:" -ForegroundColor Cyan
        Write-Host "1. Test social sharing functionality using test-social-sharing.js" -ForegroundColor White
        Write-Host "2. Update any existing campaigns to enable share incentives" -ForegroundColor White
        Write-Host "3. Configure Open Graph meta tags for better social previews" -ForegroundColor White
        Write-Host "4. Monitor share analytics and viral coefficient" -ForegroundColor White
        
    } else {
        Write-Host "`n❌ Migration failed!" -ForegroundColor Red
        Write-Host "Please check the error messages above and fix any issues." -ForegroundColor Yellow
    }
} catch {
    Write-Host "`n❌ Error applying migration: $_" -ForegroundColor Red
    exit 1
}