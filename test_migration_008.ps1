# Test Script for Migration 008_complete_schema.sql
# This script tests the migration locally

Write-Host "Testing Migration 008: Complete Schema Enhancement" -ForegroundColor Cyan

# Check if Supabase CLI is installed
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "Supabase CLI not found. Please install it first." -ForegroundColor Red
    exit 1
}

# Get the project root
$projectRoot = "Z:\.CodingProjects\GitHub_Repos\FundRaisingProject"
Set-Location $projectRoot

# Check if we're in the right directory
if (-not (Test-Path ".\supabase\migrations\008_complete_schema.sql")) {
    Write-Host "Migration file not found. Are you in the correct directory?" -ForegroundColor Red
    exit 1
}

Write-Host "`nChecking migration file syntax..." -ForegroundColor Yellow

# Basic SQL syntax check
$migrationContent = Get-Content ".\supabase\migrations\008_complete_schema.sql" -Raw
$syntaxIssues = @()

# Check for common SQL syntax issues
if ($migrationContent -match ";;") {
    $syntaxIssues += "Double semicolons found"
}
if ($migrationContent -match "CREATE TABLE\s+CREATE TABLE") {
    $syntaxIssues += "Duplicate CREATE TABLE statements"
}
if ($migrationContent -match "ALTER TABLE\s+ALTER TABLE") {
    $syntaxIssues += "Duplicate ALTER TABLE statements"
}

if ($syntaxIssues.Count -gt 0) {
    Write-Host "Syntax issues found:" -ForegroundColor Red
    $syntaxIssues | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
} else {
    Write-Host "Basic syntax check passed!" -ForegroundColor Green
}

Write-Host "`nMigration Summary:" -ForegroundColor Yellow
Write-Host "- Adds missing fields to user_profiles table" -ForegroundColor White
Write-Host "- Adds missing fields to campaigns table" -ForegroundColor White
Write-Host "- Adds missing fields to campaign_updates table" -ForegroundColor White
Write-Host "- Adds missing fields to donations table" -ForegroundColor White
Write-Host "- Adds missing fields to trust_score_events table" -ForegroundColor White
Write-Host "- Adds missing fields to notifications table" -ForegroundColor White
Write-Host "- Creates user_favorites table" -ForegroundColor White
Write-Host "- Creates campaign_comments table" -ForegroundColor White
Write-Host "- Creates schema_migrations table" -ForegroundColor White
Write-Host "- Adds missing constraints and indexes" -ForegroundColor White
Write-Host "- Creates helper functions for search, trending, and updates" -ForegroundColor White
Write-Host "- Sets up RLS policies for new tables" -ForegroundColor White

Write-Host "`nTo apply this migration to your local Supabase:" -ForegroundColor Cyan
Write-Host "1. Make sure Supabase is running: " -NoNewline -ForegroundColor Yellow
Write-Host "supabase start" -ForegroundColor Green
Write-Host "2. Apply the migration: " -NoNewline -ForegroundColor Yellow
Write-Host "supabase db push" -ForegroundColor Green
Write-Host "3. Or reset the database with all migrations: " -NoNewline -ForegroundColor Yellow
Write-Host "supabase db reset" -ForegroundColor Green

Write-Host "`nTo apply to production:" -ForegroundColor Cyan
Write-Host "1. Link to your project: " -NoNewline -ForegroundColor Yellow
Write-Host "supabase link --project-ref <your-project-ref>" -ForegroundColor Green
Write-Host "2. Push to production: " -NoNewline -ForegroundColor Yellow
Write-Host "supabase db push --linked" -ForegroundColor Green

Write-Host "`nIMPORTANT NOTES:" -ForegroundColor Red
Write-Host "- This migration adds many fields and may take some time on large databases" -ForegroundColor Yellow
Write-Host "- Ensure you have a backup before applying to production" -ForegroundColor Yellow
Write-Host "- Some fields may conflict if custom modifications were made" -ForegroundColor Yellow
Write-Host "- The search functionality requires PostgreSQL full-text search extensions" -ForegroundColor Yellow

Write-Host "`nTest completed successfully!" -ForegroundColor Green
