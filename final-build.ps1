Write-Host "🚀 Final Build Process for Blessed-Horizon" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Check for any remaining missing dependencies
Write-Host "`n📦 Installing any remaining dependencies..." -ForegroundColor Yellow

$remainingDeps = @(
    "react-markdown",
    "@tiptap/react",
    "@tiptap/starter-kit",
    "framer-motion",
    "@supabase/auth-helpers-react",
    "react-hook-form",
    "class-variance-authority"
)

Write-Host "Installing final dependencies..." -ForegroundColor White
# Ensure no trailing spaces and join properly
$cleanDeps = $remainingDeps | ForEach-Object { $_.Trim() }
npm install @($cleanDeps)

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# 2. Clean previous builds
Write-Host "`n🧹 Cleaning previous build artifacts..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Path "dist" -Recurse -Force
}

# 3. Run the build
Write-Host "`n🏗️  Building the application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Build failed!" -ForegroundColor Red
    Write-Host "Please check the error messages above." -ForegroundColor Yellow
    exit 1
}

# 4. Check if build succeeded
if (Test-Path "dist/index.html") {
    Write-Host "`n✅ Build completed successfully!" -ForegroundColor Green
    
    # Show build details
    $buildSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    $fileCount = (Get-ChildItem -Path "dist" -Recurse -File).Count
    
    Write-Host "`n📊 Build Statistics:" -ForegroundColor Cyan
    Write-Host "   Total Size: $([math]::Round($buildSize, 2)) MB" -ForegroundColor White
    Write-Host "   File Count: $fileCount files" -ForegroundColor White
    Write-Host "   Output Directory: $(Resolve-Path dist)" -ForegroundColor White
    
    # 5. Test local preview
    Write-Host "`n🌐 Testing local preview server..." -ForegroundColor Yellow
    Write-Host "Starting preview server on http://localhost:4173" -ForegroundColor White
    Write-Host "Press Ctrl+C to stop the server when done testing." -ForegroundColor Gray
    
    npm run preview
} else {
    Write-Host "`n❌ Build directory not created properly!" -ForegroundColor Red
    Write-Host "The dist/index.html file was not found." -ForegroundColor Yellow
    exit 1
}
