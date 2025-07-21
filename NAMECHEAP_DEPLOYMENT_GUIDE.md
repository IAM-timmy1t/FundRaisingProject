# Namecheap Deployment Guide for Blessed-Horizon

This guide provides step-by-step instructions for deploying the Blessed-Horizon fundraising platform to Namecheap hosting.

## Prerequisites

Before deploying, ensure you have:
- A Namecheap hosting account (Shared, VPS, or Dedicated)
- Access to cPanel or hosting control panel
- Domain name configured
- SSL certificate (Let's Encrypt or purchased)

## Step 1: Build the Application Locally

1. **Run the build script:**
   ```powershell
   ./final-build.ps1
   ```

2. **Verify the build:**
   - Check that the `dist` folder is created
   - Test locally with `npm run preview`
   - Visit http://localhost:4173 to verify the app works

## Step 2: Prepare Environment Configuration

Since Namecheap shared hosting doesn't support environment variables, you need to:

1. **Create a production configuration file:**
   ```javascript
   // Create public/config.js
   window.ENV = {
     VITE_SUPABASE_URL: "your-production-supabase-url",
     VITE_SUPABASE_ANON_KEY: "your-production-anon-key",
     VITE_STRIPE_PUBLISHABLE_KEY: "your-production-stripe-key",
     // Add other public environment variables
   };
   ```

2. **Update index.html to load config:**
   Add before other scripts in `dist/index.html`:
   ```html
   <script src="/config.js"></script>
   ```

## Step 3: Upload Files to Namecheap

### For Shared Hosting:

1. **Access cPanel:**
   - Log into your Namecheap account
   - Navigate to cPanel

2. **Open File Manager:**
   - Go to File Manager
   - Navigate to `public_html` (or your domain folder)

3. **Upload files:**
   - Upload all files from the `dist` folder
   - Ensure `.htaccess` is uploaded (may be hidden)
   - Set file permissions to 644 for files, 755 for directories

### For VPS/Dedicated Hosting:

1. **Connect via SSH:**
   ```bash
   ssh username@your-server-ip
   ```

2. **Navigate to web directory:**
   ```bash
   cd /home/username/public_html
   ```

3. **Upload files via SCP or SFTP:**
   ```bash
   scp -r dist/* username@your-server-ip:/home/username/public_html/
   ```

## Step 4: Configure Web Server

### Apache Configuration (.htaccess):

The build script already creates an `.htaccess` file. Ensure it contains:

```apache
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
  Header set Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:;"
</IfModule>

# Enable compression
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
</IfModule>
```

### Nginx Configuration (for VPS):

If using Nginx, create/update your site configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /home/username/public_html;
    index index.html;

    # Force HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    root /home/username/public_html;
    index index.html;

    # SSL configuration
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Step 5: Set Up Supabase

1. **Configure Supabase Project:**
   - Go to your Supabase dashboard
   - Add your domain to allowed URLs in Authentication settings
   - Configure CORS in Storage settings if using file uploads

2. **Run Database Migrations:**
   - Go to SQL Editor in Supabase
   - Run all migration files from `supabase/migrations/` in order
   - Verify tables and policies are created

3. **Deploy Edge Functions:**
   ```bash
   supabase functions deploy --project-ref your-project-ref
   ```

## Step 6: Configure External Services

### Stripe Configuration:

1. **Add webhook endpoint:**
   - Go to Stripe Dashboard > Webhooks
   - Add endpoint: `https://yourdomain.com/api/stripe-webhook`
   - Select events to listen for

2. **Update domain whitelist:**
   - Add your domain to Stripe's domain whitelist
   - Configure payment method settings

### Email Service:

1. **Configure SMTP in Supabase:**
   - Go to Settings > Authentication
   - Configure SMTP settings for email notifications

## Step 7: Post-Deployment Checklist

- [ ] Verify the site loads at your domain
- [ ] Test user registration and login
- [ ] Create a test campaign
- [ ] Make a test donation (use Stripe test mode)
- [ ] Check email notifications
- [ ] Verify image uploads work
- [ ] Test mobile responsiveness
- [ ] Check browser console for errors
- [ ] Monitor Supabase logs for any issues

## Step 8: SSL Certificate Setup

### For Shared Hosting:
1. Go to cPanel > SSL/TLS
2. Generate or upload SSL certificate
3. Install certificate for your domain

### For VPS/Dedicated:
Use Let's Encrypt for free SSL:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Troubleshooting

### Common Issues:

1. **404 errors on page refresh:**
   - Ensure `.htaccess` or nginx config handles SPA routing
   
2. **CORS errors:**
   - Add your domain to Supabase allowed URLs
   - Check Stripe domain whitelist

3. **Environment variables not working:**
   - Use the `public/config.js` approach for shared hosting
   - For VPS, use proper environment variable configuration

4. **Slow loading:**
   - Enable gzip compression
   - Configure browser caching
   - Use a CDN like Cloudflare

### Support Resources:

- Namecheap Support: https://www.namecheap.com/support/
- Supabase Documentation: https://supabase.com/docs
- Project Repository: [Your GitHub URL]

## Security Recommendations

1. **Regular Updates:**
   - Keep dependencies updated
   - Monitor security advisories

2. **Backup Strategy:**
   - Regular database backups in Supabase
   - File backup via cPanel or server snapshots

3. **Monitoring:**
   - Set up uptime monitoring
   - Configure error tracking (e.g., Sentry)
   - Monitor Supabase usage and limits

## Performance Optimization

1. **Use a CDN:**
   - Configure Cloudflare or similar CDN
   - Cache static assets at edge locations

2. **Image Optimization:**
   - Use WebP format for images
   - Implement lazy loading

3. **Database Optimization:**
   - Create appropriate indexes in Supabase
   - Use database connection pooling

## Maintenance

### Regular Tasks:
- Check and rotate logs
- Update SSL certificates
- Monitor disk usage
- Review security logs

### Update Process:
1. Build new version locally
2. Test thoroughly
3. Upload to staging environment
4. Verify staging
5. Deploy to production during low-traffic period

## Conclusion

Your Blessed-Horizon platform should now be live on Namecheap! Remember to:
- Monitor the application regularly
- Keep all services and dependencies updated
- Maintain regular backups
- Follow security best practices

For additional support, consult the project documentation or reach out to the development team. 