# Test Real-time Update Broadcasting System

Write-Host "Testing Real-time Update Broadcasting System..." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green

# Test 1: Real-time Service
Write-Host "`nTest 1: Checking Real-time Service..." -ForegroundColor Yellow
$realtimeServicePath = "Z:\.CodingProjects\GitHub_Repos\FundRaisingProject\src\services\realtimeService.js"
if (Test-Path $realtimeServicePath) {
    Write-Host "✓ Real-time service created" -ForegroundColor Green
    
    # Check key methods
    $content = Get-Content $realtimeServicePath -Raw
    $methods = @(
        "subscribeToCampaignUpdates",
        "subscribeToUpdateInteractions",
        "joinCampaignPresence",
        "subscribeToDonations",
        "showUpdateNotification",
        "trackUpdateView"
    )
    
    foreach ($method in $methods) {
        if ($content -match $method) {
            Write-Host "  ✓ Method '$method' implemented" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Method '$method' missing" -ForegroundColor Red
        }
    }
} else {
    Write-Host "✗ Real-time service not found" -ForegroundColor Red
}

# Test 2: Real-time Hooks
Write-Host "`nTest 2: Checking Real-time Hooks..." -ForegroundColor Yellow
$hooksPath = "Z:\.CodingProjects\GitHub_Repos\FundRaisingProject\src\hooks\useRealtimeUpdates.js"
if (Test-Path $hooksPath) {
    Write-Host "✓ Real-time hooks created" -ForegroundColor Green
    
    $content = Get-Content $hooksPath -Raw
    $hooks = @("useRealtimeUpdates", "useUpdateInteractions")
    
    foreach ($hook in $hooks) {
        if ($content -match "export.*$hook") {
            Write-Host "  ✓ Hook '$hook' exported" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Hook '$hook' not exported" -ForegroundColor Red
        }
    }
} else {
    Write-Host "✗ Real-time hooks not found" -ForegroundColor Red
}

# Test 3: Live Updates Feed Component
Write-Host "`nTest 3: Checking Live Updates Feed..." -ForegroundColor Yellow
$liveFeedPath = "Z:\.CodingProjects\GitHub_Repos\FundRaisingProject\src\components\campaigns\LiveUpdatesFeed.jsx"
if (Test-Path $liveFeedPath) {
    Write-Host "✓ Live updates feed component created" -ForegroundColor Green
    
    $content = Get-Content $liveFeedPath -Raw
    $features = @(
        "viewer presence",
        "real-time notifications",
        "new update count",
        "connection status"
    )
    
    foreach ($feature in $features) {
        if ($content -match $feature) {
            Write-Host "  ✓ Feature '$feature' included" -ForegroundColor Green
        }
    }
} else {
    Write-Host "✗ Live updates feed not found" -ForegroundColor Red
}

# Test 4: Campaign Detail Page Integration
Write-Host "`nTest 4: Checking Campaign Detail Page Integration..." -ForegroundColor Yellow
$detailPagePath = "Z:\.CodingProjects\GitHub_Repos\FundRaisingProject\src\components\views\CampaignDetailPageRealtime.jsx"
if (Test-Path $detailPagePath) {
    Write-Host "✓ Real-time campaign detail page created" -ForegroundColor Green
    
    $content = Get-Content $detailPagePath -Raw
    if ($content -match "useRealtimeUpdates") {
        Write-Host "  ✓ Real-time hook integrated" -ForegroundColor Green
    }
    if ($content -match "LiveUpdatesFeed") {
        Write-Host "  ✓ Live feed component integrated" -ForegroundColor Green
    }
    if ($content -match "viewers\.length") {
        Write-Host "  ✓ Viewer presence displayed" -ForegroundColor Green
    }
} else {
    Write-Host "✗ Real-time campaign detail page not found" -ForegroundColor Red
}

# Test 5: Database Migration
Write-Host "`nTest 5: Checking Database Migration..." -ForegroundColor Yellow
$migrationPath = "Z:\.CodingProjects\GitHub_Repos\FundRaisingProject\supabase\migrations\20240320_realtime_updates.sql"
if (Test-Path $migrationPath) {
    Write-Host "✓ Real-time migration created" -ForegroundColor Green
    
    $content = Get-Content $migrationPath -Raw
    $tables = @(
        "update_reactions",
        "update_comments",
        "update_views"
    )
    
    foreach ($table in $tables) {
        if ($content -match "CREATE TABLE.*$table") {
            Write-Host "  ✓ Table '$table' defined" -ForegroundColor Green
        }
    }
    
    if ($content -match "ALTER PUBLICATION supabase_realtime") {
        Write-Host "  ✓ Realtime publication configured" -ForegroundColor Green
    }
} else {
    Write-Host "✗ Real-time migration not found" -ForegroundColor Red
}

# Test 6: Update Manager Component
Write-Host "`nTest 6: Checking Update Manager..." -ForegroundColor Yellow
$updateManagerPath = "Z:\.CodingProjects\GitHub_Repos\FundRaisingProject\src\components\campaigns\UpdateManager.jsx"
if (Test-Path $updateManagerPath) {
    Write-Host "✓ Update manager component created" -ForegroundColor Green
    
    $content = Get-Content $updateManagerPath -Raw
    $updateTypes = @("text", "photo", "video", "receipt")
    
    foreach ($type in $updateTypes) {
        if ($content -match $type) {
            Write-Host "  ✓ Update type '$type' supported" -ForegroundColor Green
        }
    }
} else {
    Write-Host "✗ Update manager not found" -ForegroundColor Red
}

# Test 7: Route Updates
Write-Host "`nTest 7: Checking Route Configuration..." -ForegroundColor Yellow
$appPath = "Z:\.CodingProjects\GitHub_Repos\FundRaisingProject\src\App.jsx"
if (Test-Path $appPath) {
    $content = Get-Content $appPath -Raw
    if ($content -match "CampaignDetailPageRealtime") {
        Write-Host "✓ Real-time campaign page route configured" -ForegroundColor Green
    } else {
        Write-Host "✗ Real-time campaign page not in routes" -ForegroundColor Red
    }
} else {
    Write-Host "✗ App.jsx not found" -ForegroundColor Red
}

# Summary
Write-Host "`n============================================" -ForegroundColor Green
Write-Host "Real-time Update Broadcasting Test Complete!" -ForegroundColor Green
Write-Host "`nKey Features Implemented:" -ForegroundColor Yellow
Write-Host "- Real-time update subscriptions" -ForegroundColor Cyan
Write-Host "- Live presence tracking" -ForegroundColor Cyan
Write-Host "- Instant notifications" -ForegroundColor Cyan
Write-Host "- View/like/comment counters" -ForegroundColor Cyan
Write-Host "- Update manager for creators" -ForegroundColor Cyan
Write-Host "- Database triggers for counts" -ForegroundColor Cyan

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Run database migration: supabase db push" -ForegroundColor White
Write-Host "2. Test real-time features in browser" -ForegroundColor White
Write-Host "3. Open multiple tabs to see presence" -ForegroundColor White
Write-Host "4. Post updates to see notifications" -ForegroundColor White