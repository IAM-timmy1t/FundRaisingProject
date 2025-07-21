# 🚀 Blessed-Horizon Production Setup Guide

## Overview
This guide provides step-by-step instructions for setting up Blessed-Horizon in a production environment.

## Prerequisites

- Node.js 18+ and npm/yarn installed
- PostgreSQL 14+ database
- Redis 6+ for session management
- Domain name with DNS access
- SSL certificate (or use Let's Encrypt)
- Linux server (Ubuntu 20.04+ recommended)
- Docker and Docker Compose (optional but recommended)

## 🛠️ Server Setup

### 1. Initial Server Configuration

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y git nginx postgresql redis-server certbot python3-certbot-nginx

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Create application user
sudo useradd -m -s /bin/bash blessed-horizon
sudo usermod -aG sudo blessed-horizon
```

### 2. Database Setup

```bash
# Create production database
sudo -u postgres psql << EOF
CREATE DATABASE blessed_horizon_prod;
CREATE USER blessed_user WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE blessed_horizon_prod TO blessed_user;
EOF

# Configure PostgreSQL for production
sudo nano /etc/postgresql/14/main/postgresql.conf
# Add/modify these settings:
# max_connections = 200
# shared_buffers = 256MB
# effective_cache_size = 1GB
# work_mem = 4MB
# maintenance_work_mem = 64MB

# Enable SSL for PostgreSQL
# Copy SSL certificates to PostgreSQL directory
sudo systemctl restart postgresql
```

### 3. Redis Configuration

```bash
# Configure Redis for production
sudo nano /etc/redis/redis.conf
# Set these values:
# maxmemory 256mb
# maxmemory-policy allkeys-lru
# requirepass your-redis-password

# Enable Redis persistence
# save 900 1
# save 300 10
# save 60 10000

sudo systemctl restart redis-server
```

## 📦 Application Deployment

### 1. Clone and Setup Repository

```bash
# Switch to application user
sudo su - blessed-horizon

# Clone repository
git clone https://github.com/your-org/blessed-horizon.git
cd blessed-horizon

# Install dependencies
npm install --production

# Copy and configure environment variables
cp .env.production.template .env.production
nano .env.production  # Fill in all production values
```

### 2. Build Application

```bash
# Build production assets
npm run build

# Run database migrations
npm run migrate:prod

# Verify build
npm run test:prod
```

### 3. Configure PM2

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'blessed-horizon',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    cron_restart: '0 2 * * *',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
  }]
};
```

Start application:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the instructions to enable auto-start
```

## 🔒 Nginx Configuration

### 1. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/blessed-horizon
```

Add configuration:

```nginx
server {
    listen 80;
    server_name blessed-horizon.com www.blessed-horizon.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name blessed-horizon.com www.blessed-horizon.com;

    ssl_certificate /etc/letsencrypt/live/blessed-horizon.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/blessed-horizon.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com wss://;" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    location /static/ {
        alias /home/blessed-horizon/blessed-horizon/dist/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 2. Enable Site and SSL

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/blessed-horizon /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL with Let's Encrypt
sudo certbot --nginx -d blessed-horizon.com -d www.blessed-horizon.com

# Setup auto-renewal
sudo certbot renew --dry-run
```

## 🔧 Supabase Edge Functions Deployment

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Deploy edge functions
supabase functions deploy payment-webhook --project-ref your-project-ref
supabase functions deploy trust-score-update --project-ref your-project-ref
supabase functions deploy content-moderation --project-ref your-project-ref

# Set function secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx --project-ref your-project-ref
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx --project-ref your-project-ref
```

## 📊 Monitoring Setup

### 1. Application Monitoring

```bash
# Install monitoring agent (New Relic example)
curl -Ls https://download.newrelic.com/install/newrelic-cli/scripts/install.sh | bash
sudo NEW_RELIC_API_KEY=YOUR_API_KEY NEW_RELIC_ACCOUNT_ID=YOUR_ACCOUNT_ID /usr/local/bin/newrelic install

# Configure PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### 2. Setup Health Checks

Create health check endpoint monitor:

```bash
# Create health check script
cat > /home/blessed-horizon/health-check.sh << 'EOF'
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" https://blessed-horizon.com/api/health)
if [ $response -eq 200 ]; then
    echo "Health check passed"
else
    echo "Health check failed with status $response"
    # Send alert
    curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
         -H 'Content-Type: application/json' \
         -d '{"text":"🚨 Blessed-Horizon health check failed!"}'
fi
EOF

chmod +x /home/blessed-horizon/health-check.sh

# Add to crontab
crontab -e
# Add: */5 * * * * /home/blessed-horizon/health-check.sh
```

## 🔄 Backup Configuration

### 1. Database Backup

```bash
# Create backup script
cat > /home/blessed-horizon/backup-database.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/blessed-horizon/backups/database"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="blessed_horizon_prod_$DATE.sql.gz"

# Backup database
PGPASSWORD=$DB_PASSWORD pg_dump -h localhost -U blessed_user -d blessed_horizon_prod | gzip > $BACKUP_DIR/$FILENAME

# Upload to S3
aws s3 cp $BACKUP_DIR/$FILENAME s3://blessed-horizon-backups/database/

# Remove local backups older than 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
EOF

chmod +x /home/blessed-horizon/backup-database.sh

# Schedule daily backup
crontab -e
# Add: 0 2 * * * /home/blessed-horizon/backup-database.sh
```

## 🚦 Final Steps

### 1. Security Hardening

```bash
# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Fail2ban setup
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### 2. Performance Testing

```bash
# Run load tests
npm run test:load

# Check performance metrics
npm run lighthouse:prod
```

### 3. DNS Configuration

Configure your domain DNS:
- A record: @ -> Your server IP
- A record: www -> Your server IP
- MX records for email
- TXT records for SPF/DKIM

### 4. Verify Everything

```bash
# Check all services
systemctl status nginx
systemctl status postgresql
systemctl status redis
pm2 status

# Test application
curl https://blessed-horizon.com/api/health

# Check logs
pm2 logs
tail -f /var/log/nginx/error.log
```

## 📝 Post-Deployment

1. Monitor application for first 24 hours
2. Check error rates and performance metrics
3. Verify backup processes are working
4. Test all critical user flows
5. Monitor server resources

## 🆘 Troubleshooting

Common issues and solutions:

- **502 Bad Gateway**: Check if PM2 is running and application is listening on correct port
- **Database Connection Failed**: Verify PostgreSQL is running and credentials are correct
- **Redis Connection Failed**: Check Redis password and ensure it's running
- **SSL Issues**: Ensure certificates are valid and nginx configuration is correct

For more help, check logs:
- Application logs: `pm2 logs`
- Nginx logs: `/var/log/nginx/error.log`
- System logs: `journalctl -xe`
