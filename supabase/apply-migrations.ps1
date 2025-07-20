# Apply Supabase Migrations Script
# This script applies the migration files to your Supabase database

$ErrorActionPreference = "Stop"

# Load environment variables
$envFile = Get-Content ".env.local" -Raw
$supabaseUrl = [regex]::Match($envFile, 'VITE_SUPABASE_URL=(.+)').Groups[1].Value.Trim()
$serviceRoleKey = [regex]::Match($envFile, 'SUPABASE_SERVICE_ROLE_KEY=(.+)').Groups[1].Value.Trim()

if (-not $supabaseUrl -or -not $serviceRoleKey) {
    Write-Error "Could not find SUPABASE_URL or SERVICE_ROLE_KEY in .env.local"
    exit 1
}

Write-Host "Using Supabase URL: $supabaseUrl" -ForegroundColor Green
Write-Host "Applying migrations..." -ForegroundColor Yellow

# Function to execute SQL
function Execute-SupabaseSQL {
    param(
        [string]$sql,
        [string]$description
    )
    
    Write-Host "`nApplying: $description" -ForegroundColor Cyan
    
    $body = @{
        query = $sql
    } | ConvertTo-Json

    $headers = @{
        "apikey" = $serviceRoleKey
        "Authorization" = "Bearer $serviceRoleKey"
        "Content-Type" = "application/json"
        "Prefer" = "return=minimal"
    }

    try {
        $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/query" -Method Post -Headers $headers -Body $body
        Write-Host "✓ $description applied successfully" -ForegroundColor Green
        return $true
    } catch {
        # Try alternative approach using the query endpoint
        try {
            $postgrestUrl = $supabaseUrl -replace "\.supabase\.co", ".supabase.co"
            $response = Invoke-WebRequest -Uri "$postgrestUrl/rest/v1/" -Method Post -Headers $headers -Body $sql -ContentType "application/sql"
            Write-Host "✓ $description applied successfully" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "✗ Failed to apply $description" -ForegroundColor Red
            Write-Host "Error: $_" -ForegroundColor Red
            return $false
        }
    }
}

# Read migration files
$migrations = @(
    @{
        file = "supabase/migrations/001_initial_schema.sql"
        description = "Initial Schema (tables, indexes, functions)"
    },
    @{
        file = "supabase/migrations/002_rls_policies.sql"
        description = "Row Level Security Policies"
    },
    @{
        file = "supabase/migrations/003_storage_buckets.sql"
        description = "Storage Buckets Configuration"
    }
)

$successCount = 0
$failCount = 0

foreach ($migration in $migrations) {
    if (Test-Path $migration.file) {
        $sql = Get-Content $migration.file -Raw
        
        # Split by GO statements if present, otherwise execute as one block
        $statements = $sql -split '\nGO\n'
        
        foreach ($statement in $statements) {
            if ($statement.Trim()) {
                if (Execute-SupabaseSQL -sql $statement -description $migration.description) {
                    $successCount++
                } else {
                    $failCount++
                }
            }
        }
    } else {
        Write-Host "Migration file not found: $($migration.file)" -ForegroundColor Red
        $failCount++
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Migration Summary:" -ForegroundColor Yellow
Write-Host "✓ Successful: $successCount" -ForegroundColor Green
Write-Host "✗ Failed: $failCount" -ForegroundColor Red

if ($failCount -eq 0) {
    Write-Host "`nAll migrations applied successfully!" -ForegroundColor Green
    Write-Host "`nNext Steps:" -ForegroundColor Yellow
    Write-Host "1. Visit your Supabase dashboard to verify tables" -ForegroundColor White
    Write-Host "2. Test authentication and database access" -ForegroundColor White
    Write-Host "3. Proceed with Task #4: Row Level Security verification" -ForegroundColor White
} else {
    Write-Host "`nSome migrations failed. Please check the errors above." -ForegroundColor Red
    Write-Host "You may need to apply them manually via Supabase SQL Editor." -ForegroundColor Yellow
}
