Write-Host "🚀 Complete Build Script for Blessed-Horizon" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# Check if running as administrator (may be needed for some operations)
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  Not running as administrator. Some operations may require elevation." -ForegroundColor Yellow
}

# 1. Environment Setup
Write-Host "`n📋 Step 1: Environment Setup" -ForegroundColor Yellow

# Check for .env.local file
if (-not (Test-Path ".env.local")) {
    Write-Host "Creating .env.local file from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env.local"
    Write-Host "⚠️  Please update .env.local with your actual API keys!" -ForegroundColor Red
    Write-Host "   - Supabase URL and keys" -ForegroundColor Yellow
    Write-Host "   - Stripe API keys" -ForegroundColor Yellow
    Write-Host "   - Email configuration" -ForegroundColor Yellow
    Write-Host "   - Push notification keys" -ForegroundColor Yellow
    pause
}

# 2. Install Dependencies
Write-Host "`n📦 Step 2: Installing Dependencies" -ForegroundColor Yellow
Write-Host "Installing npm packages..." -ForegroundColor White
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# 3. Build Frontend
Write-Host "`n🏗️  Step 3: Building Frontend Application" -ForegroundColor Yellow
Write-Host "Running Vite build..." -ForegroundColor White

# Clean previous build
if (Test-Path "dist") {
    Remove-Item -Path "dist" -Recurse -Force
}

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

if (Test-Path "dist") {
    Write-Host "✅ Build completed successfully!" -ForegroundColor Green
    Write-Host "   Output directory: ./dist" -ForegroundColor Gray
    
    # Show build size
    $buildSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "   Build size: $([math]::Round($buildSize, 2)) MB" -ForegroundColor Gray
} else {
    Write-Host "❌ Build directory not created!" -ForegroundColor Red
    exit 1
}

# 4. Verify Supabase Configuration
Write-Host "`n🔐 Step 4: Verifying Supabase Configuration" -ForegroundColor Yellow

$envContent = Get-Content ".env.local" -Raw
$supabaseUrl = [regex]::Match($envContent, 'VITE_SUPABASE_URL=(.+)').Groups[1].Value.Trim()
$supabaseAnonKey = [regex]::Match($envContent, 'VITE_SUPABASE_ANON_KEY=(.+)').Groups[1].Value.Trim()

if ($supabaseUrl -and $supabaseUrl -ne "your_supabase_project_url") {
    Write-Host "✅ Supabase URL configured: $supabaseUrl" -ForegroundColor Green
} else {
    Write-Host "❌ Supabase URL not configured!" -ForegroundColor Red
    Write-Host "   Please update VITE_SUPABASE_URL in .env.local" -ForegroundColor Yellow
}

# 5. Prepare Deployment Package
Write-Host "`n📦 Step 5: Preparing Deployment Package" -ForegroundColor Yellow

$deployDir = "deployment-package"
if (Test-Path $deployDir) {
    Remove-Item -Path $deployDir -Recurse -Force
}

New-Item -ItemType Directory -Path $deployDir | Out-Null

# Copy built files
Write-Host "Copying build files..." -ForegroundColor White
Copy-Item -Path "dist/*" -Destination $deployDir -Recurse

# Create server configuration files
Write-Host "Creating server configuration files..." -ForegroundColor White

# Create .htaccess for Apache servers
$htaccessContent = @'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Security headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache control
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType text/javascript "access plus 1 month"
</IfModule>
'@

Set-Content -Path "$deployDir/.htaccess" -Value $htaccessContent

# Create web.config for IIS servers
$webConfigContent = @'
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Handle History Mode and custom 404/500" stopProcessing="true">
          <match url="(.*)" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <remove fileExtension=".woff2" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
    </staticContent>
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="SAMEORIGIN" />
        <add name="X-XSS-Protection" value="1; mode=block" />
        <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
'@

Set-Content -Path "$deployDir/web.config" -Value $webConfigContent

# 6. Create deployment instructions
Write-Host "`n📝 Step 6: Creating Deployment Instructions" -ForegroundColor Yellow

$deploymentInstructions = @"
# Blessed-Horizon Deployment Instructions

## Files to Upload
Upload all files from the 'deployment-package' directory to your web hosting root directory.

## For Namecheap Shared Hosting:
1. Log into cPanel
2. Navigate to File Manager
3. Open 'public_html' directory
4. Upload all files from deployment-package
5. Ensure .htaccess file is uploaded (may be hidden)

## Environment Variables
Your hosting provider needs to support environment variables or you'll need to:
1. Create a separate API endpoint that serves configuration
2. Or use a build-time configuration (less secure)

## Post-Deployment Steps:
1. Test the application at your domain
2. Verify Supabase connection
3. Test Stripe integration (use test mode first)
4. Configure email settings
5. Set up SSL certificate (usually via cPanel)

## Important Security Notes:
- Never commit .env.local to version control
- Use HTTPS for production
- Configure proper CORS settings in Supabase
- Set up proper domain whitelist in Stripe

## Supabase Setup Required:
1. Run migrations in Supabase SQL editor
2. Configure storage buckets
3. Set up Edge Functions
4. Configure authentication providers
"@

Set-Content -Path "$deployDir/DEPLOYMENT_INSTRUCTIONS.txt" -Value $deploymentInstructions

# 7. Create ZIP for easy upload
Write-Host "`n📦 Step 7: Creating Deployment ZIP" -ForegroundColor Yellow

$zipPath = "blessed-horizon-deployment.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath
}

# Try to use built-in compression
try {
    Compress-Archive -Path "$deployDir/*" -DestinationPath $zipPath -CompressionLevel Optimal
    Write-Host "✅ Created deployment package: $zipPath" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not create ZIP file. Please manually zip the $deployDir folder." -ForegroundColor Yellow
}

# 8. Final Summary
Write-Host "`n✨ Build Complete!" -ForegroundColor Green
Write-Host "=================" -ForegroundColor Green

Write-Host "`n📁 Build Outputs:" -ForegroundColor Cyan
Write-Host "   - Frontend build: ./dist/" -ForegroundColor White
Write-Host "   - Deployment package: ./$deployDir/" -ForegroundColor White
if (Test-Path $zipPath) {
    Write-Host "   - Deployment ZIP: ./$zipPath" -ForegroundColor White
}

Write-Host "`n⚠️  Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update .env.local with production values" -ForegroundColor White
Write-Host "2. Set up Supabase project and run migrations" -ForegroundColor White
Write-Host "3. Configure Stripe webhooks" -ForegroundColor White
Write-Host "4. Upload files to your hosting provider" -ForegroundColor White
Write-Host "5. Test all features in production" -ForegroundColor White

Write-Host "`n📚 Documentation:" -ForegroundColor Cyan
Write-Host "   - Deployment Guide: ./DEPLOYMENT_GUIDE.md" -ForegroundColor White
Write-Host "   - Manual Setup: ./MANUAL_DEPLOYMENT_GUIDE.md" -ForegroundColor White
Write-Host "   - Production Setup: ./docs/PRODUCTION_SETUP_GUIDE.md" -ForegroundColor White

Write-Host "`n🎉 Good luck with your deployment!" -ForegroundColor Green 