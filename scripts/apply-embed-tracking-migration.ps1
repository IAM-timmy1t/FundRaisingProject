Write-Host "`n📦 Applying Embed Tracking Functions Migration..." -ForegroundColor Cyan

$projectPath = "Z:\.CodingProjects\GitHub_Repos\FundRaisingProject"
Set-Location $projectPath

Write-Host "`nApplying migration: 023_embed_tracking_functions.sql" -ForegroundColor Yellow

try {
    # Apply the migration
    npx supabase db push
    
    Write-Host "`n✅ Migration applied successfully!" -ForegroundColor Green
    
    Write-Host "`n📋 Functions created:" -ForegroundColor Yellow
    Write-Host "- track_embed_view()" -ForegroundColor Gray
    Write-Host "- track_embed_click()" -ForegroundColor Gray
    Write-Host "- get_embed_analytics()" -ForegroundColor Gray
    Write-Host "- track_embed_conversion()" -ForegroundColor Gray
    
    Write-Host "`n🎉 Social Sharing Features are now fully operational!" -ForegroundColor Green
    
} catch {
    Write-Host "`n❌ Error applying migration: $_" -ForegroundColor Red
}
