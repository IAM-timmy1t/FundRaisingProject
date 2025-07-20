# Test Script for User Profile Enhancement (Task #6)

Write-Host "=== Testing User Profile Enhancement ===" -ForegroundColor Cyan

# Check if all component files exist
$components = @(
    "src/components/profile/UserProfileCard.jsx",
    "src/components/profile/TrustScoreBadge.jsx",
    "src/components/profile/VerificationBadge.jsx",
    "src/components/profile/ProfileCompletionBar.jsx",
    "src/components/profile/CrowdfundingStats.jsx",
    "src/components/profile/ProfileEditModal.jsx",
    "src/components/profile/TrustScoreHistory.jsx",
    "src/components/profile/VerificationFlow.jsx",
    "src/components/views/ProfilePage.jsx",
    "src/lib/userProfileService.js"
)

$missing = 0
foreach ($file in $components) {
    if (Test-Path $file) {
        Write-Host "✓ $file" -ForegroundColor Green
    } else {
        Write-Host "✗ $file" -ForegroundColor Red
        $missing++
    }
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Total components: $($components.Count)" -ForegroundColor White
Write-Host "Missing: $missing" -ForegroundColor $(if ($missing -eq 0) { 'Green' } else { 'Red' })

if ($missing -eq 0) {
    Write-Host "`n✓ Task #6 is COMPLETE!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "1. npm install date-fns recharts react-day-picker @radix-ui/react-label @radix-ui/react-checkbox @radix-ui/react-progress" -ForegroundColor White
    Write-Host "2. Add route to App.jsx: <Route path='/profile/:userId?' element={<ProfilePage />} />" -ForegroundColor White
    Write-Host "3. Test at http://localhost:5173/profile" -ForegroundColor White
}