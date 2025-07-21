#!/bin/bash
# Maintenance Mode Script for Blessed-Horizon
# Enables/disables maintenance mode with custom message

set -euo pipefail

# Configuration
NGINX_SITES="/etc/nginx/sites-available/blessed-horizon"
MAINTENANCE_HTML="/var/www/maintenance/index.html"
BACKUP_CONFIG="/etc/nginx/sites-available/blessed-horizon.backup"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to show usage
usage() {
    echo "Usage: $0 {enable|disable|status} [message]"
    echo ""
    echo "Commands:"
    echo "  enable  - Enable maintenance mode"
    echo "  disable - Disable maintenance mode"
    echo "  status  - Check maintenance mode status"
    echo ""
    echo "Options:"
    echo "  message - Custom maintenance message (optional)"
    echo ""
    echo "Examples:"
    echo "  $0 enable"
    echo "  $0 enable 'Scheduled maintenance - back in 30 minutes'"
    echo "  $0 disable"
    exit 1
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}This script must be run as root${NC}"
    exit 1
fi

# Check arguments
if [ $# -lt 1 ]; then
    usage
fi

ACTION=$1
MESSAGE="${2:-We'll be back shortly! Our team is performing scheduled maintenance.}"

# Create maintenance directory if it doesn't exist
mkdir -p /var/www/maintenance

# Function to create maintenance page
create_maintenance_page() {
    cat > "$MAINTENANCE_HTML" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Maintenance - Blessed Horizon</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            padding: 60px;
            max-width: 600px;
            text-align: center;
        }
        
        .logo {
            font-size: 48px;
            margin-bottom: 20px;
        }
        
        h1 {
            font-size: 32px;
            color: #333;
            margin-bottom: 20px;
        }
        
        .message {
            font-size: 18px;
            color: #666;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        
        .progress-bar {
            width: 100%;
            height: 6px;
            background: #f0f0f0;
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 40px;
        }
        
        .progress {
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2);
            animation: progress 2s ease-in-out infinite;
        }
        
        @keyframes progress {
            0% { width: 0%; }
            50% { width: 100%; }
            100% { width: 0%; }
        }
        
        .links {
            display: flex;
            gap: 20px;
            justify-content: center;
        }
        
        .links a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
            transition: opacity 0.3s;
        }
        
        .links a:hover {
            opacity: 0.8;
        }
        
        .time {
            margin-top: 40px;
            font-size: 14px;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🛠️</div>
        <h1>We'll Be Right Back!</h1>
        <p class="message">$MESSAGE</p>
        <div class="progress-bar">
            <div class="progress"></div>
        </div>
        <div class="links">
            <a href="https://twitter.com/blessedhorizon" target="_blank">Twitter</a>
            <a href="mailto:support@blessed-horizon.com">Contact Support</a>
            <a href="https://status.blessed-horizon.com" target="_blank">Status Page</a>
        </div>
        <p class="time">Maintenance started: $(date)</p>
    </div>
    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => {
            window.location.reload();
        }, 30000);
    </script>
</body>
</html>
EOF
}

# Function to enable maintenance mode
enable_maintenance() {
    echo -e "${YELLOW}Enabling maintenance mode...${NC}"
    
    # Create maintenance page
    create_maintenance_page
    
    # Backup current nginx config
    cp "$NGINX_SITES" "$BACKUP_CONFIG"
    
    # Create maintenance nginx config
    cat > "$NGINX_SITES" << 'EOF'
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
    
    root /var/www/maintenance;
    
    location / {
        try_files /index.html =503;
    }
    
    location /api/health {
        return 503;
    }
    
    error_page 503 /index.html;
}
EOF

    # Test nginx config
    if nginx -t; then
        systemctl reload nginx
        echo -e "${GREEN}✅ Maintenance mode enabled${NC}"
        echo -e "${GREEN}Message: $MESSAGE${NC}"
    else
        echo -e "${RED}❌ Nginx config test failed, rolling back${NC}"
        cp "$BACKUP_CONFIG" "$NGINX_SITES"
        exit 1
    fi
}

# Function to disable maintenance mode
disable_maintenance() {
    echo -e "${YELLOW}Disabling maintenance mode...${NC}"
    
    if [ ! -f "$BACKUP_CONFIG" ]; then
        echo -e "${RED}❌ No backup config found${NC}"
        exit 1
    fi
    
    # Restore original config
    cp "$BACKUP_CONFIG" "$NGINX_SITES"
    
    # Test nginx config
    if nginx -t; then
        systemctl reload nginx
        echo -e "${GREEN}✅ Maintenance mode disabled${NC}"
        
        # Clean up
        rm -f "$BACKUP_CONFIG"
    else
        echo -e "${RED}❌ Nginx config test failed${NC}"
        exit 1
    fi
}

# Function to check status
check_status() {
    if [ -f "$BACKUP_CONFIG" ]; then
        echo -e "${YELLOW}🔧 Maintenance mode is ENABLED${NC}"
        
        if [ -f "$MAINTENANCE_HTML" ]; then
            # Extract message from HTML
            message=$(grep -oP '(?<=<p class="message">).*?(?=</p>)' "$MAINTENANCE_HTML" || echo "Unknown")
            echo -e "Message: $message"
        fi
    else
        echo -e "${GREEN}✅ Maintenance mode is DISABLED${NC}"
    fi
}

# Execute action
case "$ACTION" in
    enable)
        enable_maintenance
        ;;
    disable)
        disable_maintenance
        ;;
    status)
        check_status
        ;;
    *)
        usage
        ;;
esac
