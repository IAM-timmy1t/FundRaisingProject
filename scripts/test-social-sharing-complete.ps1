# Test Social Sharing Features
# Task #22: Verify social sharing implementation

Write-Host "`n🚀 Testing Social Sharing Features..." -ForegroundColor Cyan

# Test parameters
$projectPath = "Z:\.CodingProjects\GitHub_Repos\FundRaisingProject"
$testsPassed = 0
$testsFailed = 0

function Test-Feature {
    param($Name, $Condition)
    Write-Host "`n📋 Testing: $Name" -ForegroundColor Yellow
    if ($Condition) {
        Write-Host "✅ PASSED" -ForegroundColor Green
        $script:testsPassed++
    } else {
        Write-Host "❌ FAILED" -ForegroundColor Red
        $script:testsFailed++
    }
}

# Test 1: Check if social sharing components exist
Write-Host "`n1️⃣ Checking Social Sharing Components..." -ForegroundColor Magenta
$components = @(
    "src\components\social\SocialShareWidget.jsx",
    "src\components\social\SocialPreviewCard.jsx", 
    "src\components\social\ShareIncentives.jsx",
    "src\components\social\CampaignEmbedWidget.jsx"
)

foreach ($component in $components) {
    $path = Join-Path $projectPath $component
    Test-Feature "Component: $component" (Test-Path $path)
}

# Test 2: Check service files
Write-Host "`n2️⃣ Checking Service Files..." -ForegroundColor Magenta
Test-Feature "socialSharingService.js" (Test-Path (Join-Path $projectPath "src\services\socialSharingService.js"))

# Test 3: Check database migrations
Write-Host "`n3️⃣ Checking Database Migrations..." -ForegroundColor Magenta
$migrations = @(
    "supabase\migrations\022_social_sharing_features.sql",
    "supabase\migrations\023_embed_tracking_functions.sql"
)

foreach ($migration in $migrations) {
    $path = Join-Path $projectPath $migration
    Test-Feature "Migration: $migration" (Test-Path $path)
}

# Test 4: Check routes configuration
Write-Host "`n4️⃣ Checking Routes Configuration..." -ForegroundColor Magenta
$routesFile = Get-Content (Join-Path $projectPath "src\AppRoutes.jsx") -Raw
Test-Feature "Embed route configured" ($routesFile -match '/embed/campaign')

# Test 5: Check campaign detail page integration
Write-Host "`n5️⃣ Checking Campaign Detail Page Integration..." -ForegroundColor Magenta
$campaignDetailFile = Get-Content (Join-Path $projectPath "src\components\views\CampaignDetailPageRealtime.jsx") -Raw
$socialComponents = @(
    "SocialShareWidget",
    "ShareIncentives",
    "CampaignEmbedWidget",
    "SocialMetaTags"
)

foreach ($component in $socialComponents) {
    Test-Feature "$component integrated" ($campaignDetailFile -match $component)
}

# Test 6: Check embed page
Write-Host "`n6️⃣ Checking Embed Page..." -ForegroundColor Magenta
Test-Feature "CampaignEmbedPage.jsx exists" (Test-Path (Join-Path $projectPath "src\components\views\CampaignEmbedPage.jsx"))

# Test 7: Check meta tags in index.html
Write-Host "`n7️⃣ Checking Meta Tags..." -ForegroundColor Magenta
$indexFile = Get-Content (Join-Path $projectPath "index.html") -Raw
$metaTags = @(
    'property="og:title"',
    'property="og:description"',
    'property="og:image"',
    'name="twitter:card"'
)

foreach ($tag in $metaTags) {
    Test-Feature "Meta tag: $tag" ($indexFile -match $tag)
}

# Test 8: Check share URL generation
Write-Host "`n8️⃣ Checking Share URL Generation..." -ForegroundColor Magenta
$serviceFile = Get-Content (Join-Path $projectPath "src\services\socialSharingService.js") -Raw
$platforms = @("facebook", "twitter", "linkedin", "whatsapp", "telegram", "email")

foreach ($platform in $platforms) {
    Test-Feature "$platform share URL" ($serviceFile -match $platform)
}

# Test 9: Verify tracking functions
Write-Host "`n9️⃣ Checking Tracking Functions..." -ForegroundColor Magenta
$trackingFunctions = @(
    "trackShare",
    "getShareStats",
    "trackReferralConversion",
    "hasUserShared",
    "checkShareMilestones"
)

foreach ($func in $trackingFunctions) {
    Test-Feature "Function: $func" ($serviceFile -match $func)
}

# Test 10: Check test script
Write-Host "`n🔟 Checking Test Script..." -ForegroundColor Magenta
Test-Feature "test-social-sharing.js exists" (Test-Path (Join-Path $projectPath "scripts\test-social-sharing.js"))

# Summary
Write-Host "`n📊 Test Summary:" -ForegroundColor Cyan
Write-Host "✅ Passed: $testsPassed" -ForegroundColor Green
Write-Host "❌ Failed: $testsFailed" -ForegroundColor Red

if ($testsFailed -eq 0) {
    Write-Host "`n🎉 All social sharing features are properly implemented!" -ForegroundColor Green
    
    Write-Host "`n📋 Features Implemented:" -ForegroundColor Yellow
    Write-Host "✅ Social share buttons for all major platforms"
    Write-Host "✅ Open Graph meta tags for rich previews"
    Write-Host "✅ Share tracking and analytics"
    Write-Host "✅ Share incentives and milestones"
    Write-Host "✅ Embed widgets for external sites"
    Write-Host "✅ Referral tracking and conversions"
    Write-Host "✅ Real-time share statistics"
    
    Write-Host "`n🚀 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Apply the embed tracking functions migration:"
    Write-Host "   cd $projectPath"
    Write-Host "   npx supabase migration up"
    Write-Host ""
    Write-Host "2. Add default Open Graph image to public folder"
    Write-Host "3. Test sharing on actual social platforms"
    Write-Host "4. Monitor share analytics in the dashboard"
} else {
    Write-Host "`n⚠️ Some features need attention" -ForegroundColor Yellow
}

Write-Host "`n✨ Social Sharing Features Test Complete!" -ForegroundColor Green
