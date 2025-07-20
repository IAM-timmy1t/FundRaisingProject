# Supabase Test Utilities
# Helper functions for testing Supabase functionality

function Test-SupabaseRequest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [string]$Token = $null,
        [switch]$UseAnonKey
    )
    
    $supabaseUrl = $env:VITE_SUPABASE_URL
    $supabaseAnonKey = $env:VITE_SUPABASE_ANON_KEY
    
    $headers = @{
        "apikey" = $supabaseAnonKey
        "Content-Type" = "application/json"
    }
    
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    } elseif ($UseAnonKey) {
        $headers["Authorization"] = "Bearer $supabaseAnonKey"
    }
    
    $uri = "$supabaseUrl$Endpoint"
    
    try {
        if ($Body) {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -Body ($Body | ConvertTo-Json -Depth 10)
        } else {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers
        }
        return $response
    } catch {
        if ($_.Exception.Response.StatusCode -eq 'Unauthorized' -or $_.Exception.Response.StatusCode -eq 'Forbidden') {
            return $null
        }
        throw $_
    }
}

function Get-TestUser {
    param(
        [string]$Email,
        [string]$Password = "TestPassword123!"
    )
    
    $signUpBody = @{
        email = $Email
        password = $Password
    }
    
    $response = Test-SupabaseRequest -Method POST -Endpoint "/auth/v1/signup" -Body $signUpBody -UseAnonKey
    return $response
}

function Remove-TestData {
    param(
        [string]$Table,
        [string]$Column,
        [string]$Value
    )
    
    $supabaseUrl = $env:VITE_SUPABASE_URL
    $supabaseServiceKey = $env:SUPABASE_SERVICE_ROLE_KEY
    
    $headers = @{
        "apikey" = $supabaseServiceKey
        "Authorization" = "Bearer $supabaseServiceKey"
        "Content-Type" = "application/json"
    }
    
    $uri = "$supabaseUrl/rest/v1/$Table?$Column=eq.$Value"
    
    try {
        Invoke-RestMethod -Uri $uri -Method DELETE -Headers $headers
    } catch {
        # Ignore errors during cleanup
    }
}
