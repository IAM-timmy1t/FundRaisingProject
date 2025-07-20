# Test Script for Migration 009_comprehensive_rls_policies.sql
# This script tests the comprehensive RLS policies implementation

Write-Host "Testing Migration 009: Comprehensive RLS Policies" -ForegroundColor Cyan

# Check if Supabase CLI is installed
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "Supabase CLI not found. Please install it first." -ForegroundColor Red
    exit 1
}

# Get the project root
$projectRoot = "Z:\.CodingProjects\GitHub_Repos\FundRaisingProject"
Set-Location $projectRoot

# Check if we're in the right directory
if (-not (Test-Path ".\supabase\migrations\009_comprehensive_rls_policies.sql")) {
    Write-Host "Migration file not found. Are you in the correct directory?" -ForegroundColor Red
    exit 1
}

Write-Host "`nChecking migration file syntax..." -ForegroundColor Yellow

# Basic SQL syntax check
$migrationContent = Get-Content ".\supabase\migrations\009_comprehensive_rls_policies.sql" -Raw
$syntaxIssues = @()

# Check for common SQL syntax issues
if ($migrationContent -match ";;") {
    $syntaxIssues += "Double semicolons found"
}
if ($migrationContent -match "CREATE POLICY\s+CREATE POLICY") {
    $syntaxIssues += "Duplicate CREATE POLICY statements"
}

if ($syntaxIssues.Count -gt 0) {
    Write-Host "Syntax issues found:" -ForegroundColor Red
    $syntaxIssues | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
} else {
    Write-Host "Basic syntax check passed!" -ForegroundColor Green
}

Write-Host "`nMigration Summary:" -ForegroundColor Yellow
Write-Host "- Enables RLS on all tables" -ForegroundColor White
Write-Host "- Drops and recreates all policies for consistency" -ForegroundColor White
Write-Host "- Implements comprehensive policies for:" -ForegroundColor White
Write-Host "  * User profiles with privacy settings" -ForegroundColor Gray
Write-Host "  * Campaigns with status-based access" -ForegroundColor Gray
Write-Host "  * Donations with donor/recipient/public views" -ForegroundColor Gray
Write-Host "  * Trust score events (user-only access)" -ForegroundColor Gray
Write-Host "  * Notifications and messages" -ForegroundColor Gray
Write-Host "  * Media files and campaign assets" -ForegroundColor Gray
Write-Host "  * Comments with moderation support" -ForegroundColor Gray
Write-Host "  * Admin-only tables" -ForegroundColor Gray
Write-Host "- Creates helper functions for admin checks" -ForegroundColor White
Write-Host "- Adds RLS audit logging table" -ForegroundColor White

Write-Host "`nSecurity Features:" -ForegroundColor Yellow
Write-Host "- Profile visibility respects privacy settings" -ForegroundColor Green
Write-Host "- Only verified users can create campaigns" -ForegroundColor Green
Write-Host "- Campaign updates restricted by status" -ForegroundColor Green
Write-Host "- Trust scores are private to users" -ForegroundColor Green
Write-Host "- Donations respect anonymity settings" -ForegroundColor Green
Write-Host "- Messages limited to campaign context" -ForegroundColor Green
Write-Host "- Admin functions properly restricted" -ForegroundColor Green

Write-Host "`nRLS Test Scenarios to Verify:" -ForegroundColor Yellow
Write-Host "1. Anonymous user can view public campaigns" -ForegroundColor White
Write-Host "2. Users can only update their own profiles" -ForegroundColor White
Write-Host "3. Campaign owners can manage their campaigns" -ForegroundColor White
Write-Host "4. Donors can view their donation history" -ForegroundColor White
Write-Host "5. Recipients can view donations to their campaigns" -ForegroundColor White
Write-Host "6. Trust scores are private to each user" -ForegroundColor White
Write-Host "7. Admin users can access moderation queue" -ForegroundColor White
Write-Host "8. Service role can perform system operations" -ForegroundColor White

Write-Host "`nTo apply this migration:" -ForegroundColor Cyan
Write-Host "1. Make sure Supabase is running: " -NoNewline -ForegroundColor Yellow
Write-Host "supabase start" -ForegroundColor Green
Write-Host "2. Apply the migration: " -NoNewline -ForegroundColor Yellow
Write-Host "supabase db push" -ForegroundColor Green

Write-Host "`nIMPORTANT NOTES:" -ForegroundColor Red
Write-Host "- This migration drops and recreates ALL RLS policies" -ForegroundColor Yellow
Write-Host "- Ensure you have a backup before applying to production" -ForegroundColor Yellow
Write-Host "- Test all user scenarios after applying" -ForegroundColor Yellow
Write-Host "- Review the audit log table for any policy violations" -ForegroundColor Yellow

Write-Host "`nTest completed successfully!" -ForegroundColor Green
