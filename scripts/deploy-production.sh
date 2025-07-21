#!/bin/bash
# Production Deployment Script for Blessed-Horizon
# Handles zero-downtime deployment with rollback capability

set -euo pipefail

# Configuration
APP_DIR="/home/blessed-horizon/blessed-horizon"
BACKUP_DIR="/home/blessed-horizon/backups/deployments"
DEPLOY_USER="blessed-horizon"
GIT_REPO="https://github.com/your-org/blessed-horizon.git"
BRANCH="${1:-main}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Deployment ID
DEPLOY_ID=$(date +%Y%m%d-%H%M%S)
DEPLOY_LOG="/var/log/blessed-horizon/deploy-$DEPLOY_ID.log"

# Create log directory
mkdir -p "$(dirname "$DEPLOY_LOG")"

# Function to log
log() {
    echo -e "$1" | tee -a "$DEPLOY_LOG"
}

# Function to send notification
notify() {
    local message=$1
    local status=${2:-info}
    
    log "$message"
    
    if [ -n "$SLACK_WEBHOOK" ]; then
        local emoji="📢"
        case $status in
            success) emoji="✅" ;;
            error) emoji="❌" ;;
            warning) emoji="⚠️" ;;
        esac
        
        curl -s -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"$emoji Blessed-Horizon Deployment: $message\"}" > /dev/null 2>&1 || true
    fi
}

# Function to check prerequisites
check_prerequisites() {
    log "\n${BLUE}Checking prerequisites...${NC}"
    
    # Check if running as deploy user
    if [ "$USER" != "$DEPLOY_USER" ]; then
        log "${RED}This script must be run as $DEPLOY_USER user${NC}"
        exit 1
    fi
    
    # Check required commands
    for cmd in git npm pm2 psql redis-cli nginx; do
        if ! command -v $cmd &> /dev/null; then
            log "${RED}Required command '$cmd' not found${NC}"
            exit 1
        fi
    done
    
    # Check services
    if ! systemctl is-active --quiet postgresql; then
        log "${RED}PostgreSQL is not running${NC}"
        exit 1
    fi
    
    if ! systemctl is-active --quiet redis; then
        log "${RED}Redis is not running${NC}"
        exit 1
    fi
    
    if ! systemctl is-active --quiet nginx; then
        log "${RED}Nginx is not running${NC}"
        exit 1
    fi
    
    log "${GREEN}✓ Prerequisites check passed${NC}"
}

# Function to create backup
create_backup() {
    log "\n${BLUE}Creating backup...${NC}"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup current deployment
    if [ -d "$APP_DIR" ]; then
        tar -czf "$BACKUP_DIR/app-$DEPLOY_ID.tar.gz" -C "$APP_DIR" . || {
            log "${RED}Failed to create backup${NC}"
            exit 1
        }
        log "${GREEN}✓ Application backup created${NC}"
    fi
    
    # Backup database
    pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/db-$DEPLOY_ID.sql.gz" || {
        log "${RED}Failed to backup database${NC}"
        exit 1
    }
    log "${GREEN}✓ Database backup created${NC}"
    
    # Clean old backups (keep last 10)
    cd "$BACKUP_DIR" && ls -t app-*.tar.gz | tail -n +11 | xargs -r rm
    cd "$BACKUP_DIR" && ls -t db-*.sql.gz | tail -n +11 | xargs -r rm
}

# Function to deploy application
deploy_application() {
    log "\n${BLUE}Deploying application...${NC}"
    
    # Create temporary directory
    TEMP_DIR="/tmp/blessed-horizon-deploy-$DEPLOY_ID"
    mkdir -p "$TEMP_DIR"
    
    # Clone repository
    log "Cloning repository..."
    git clone --depth 1 --branch "$BRANCH" "$GIT_REPO" "$TEMP_DIR" || {
        log "${RED}Failed to clone repository${NC}"
        rm -rf "$TEMP_DIR"
        exit 1
    }
    
    cd "$TEMP_DIR"
    
    # Copy environment file
    if [ -f "$APP_DIR/.env.production" ]; then
        cp "$APP_DIR/.env.production" "$TEMP_DIR/.env.production"
    else
        log "${RED}.env.production not found${NC}"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci --production || {
        log "${RED}Failed to install dependencies${NC}"
        rm -rf "$TEMP_DIR"
        exit 1
    }
    
    # Build application
    log "Building application..."
    npm run build || {
        log "${RED}Failed to build application${NC}"
        rm -rf "$TEMP_DIR"
        exit 1
    }
    
    # Run tests
    log "Running tests..."
    npm run test:prod || {
        log "${RED}Tests failed${NC}"
        rm -rf "$TEMP_DIR"
        exit 1
    }
    
    log "${GREEN}✓ Application built successfully${NC}"
}

# Function to run database migrations
run_migrations() {
    log "\n${BLUE}Running database migrations...${NC}"
    
    cd "$TEMP_DIR"
    
    # Check for pending migrations
    if npm run migrate:status | grep -q "pending"; then
        log "Pending migrations found, running..."
        npm run migrate:prod || {
            log "${RED}Migrations failed${NC}"
            exit 1
        }
        log "${GREEN}✓ Migrations completed${NC}"
    else
        log "${GREEN}✓ No pending migrations${NC}"
    fi
}

# Function to perform zero-downtime deployment
zero_downtime_deploy() {
    log "\n${BLUE}Performing zero-downtime deployment...${NC}"
    
    # Create new app directory
    NEW_APP_DIR="$APP_DIR-new"
    rm -rf "$NEW_APP_DIR"
    mv "$TEMP_DIR" "$NEW_APP_DIR"
    
    # Start new instances
    cd "$NEW_APP_DIR"
    pm2 start ecosystem.config.js --name "blessed-horizon-new" || {
        log "${RED}Failed to start new instances${NC}"
        rm -rf "$NEW_APP_DIR"
        exit 1
    }
    
    # Wait for new instances to be ready
    log "Waiting for new instances to be ready..."
    sleep 10
    
    # Health check new instances
    for i in {1..30}; do
        if curl -s -f http://localhost:3001/api/health > /dev/null; then
            log "${GREEN}✓ New instances are healthy${NC}"
            break
        fi
        
        if [ $i -eq 30 ]; then
            log "${RED}New instances failed health check${NC}"
            pm2 delete blessed-horizon-new
            rm -rf "$NEW_APP_DIR"
            exit 1
        fi
        
        sleep 2
    done
    
    # Switch traffic to new instances
    log "Switching traffic to new instances..."
    OLD_APP_DIR="$APP_DIR-old"
    
    # Gracefully stop old instances
    pm2 stop blessed-horizon --silent || true
    
    # Atomic switch
    mv "$APP_DIR" "$OLD_APP_DIR" 2>/dev/null || true
    mv "$NEW_APP_DIR" "$APP_DIR"
    
    # Update PM2 configuration
    cd "$APP_DIR"
    pm2 delete blessed-horizon-new
    pm2 start ecosystem.config.js
    pm2 save
    
    # Clean up old deployment
    rm -rf "$OLD_APP_DIR"
    
    log "${GREEN}✓ Deployment completed successfully${NC}"
}

# Function to deploy edge functions
deploy_edge_functions() {
    log "\n${BLUE}Deploying edge functions...${NC}"
    
    cd "$APP_DIR"
    
    # Deploy each edge function
    for func in payment-webhook trust-score-update content-moderation; do
        log "Deploying $func..."
        supabase functions deploy $func --project-ref "$SUPABASE_PROJECT_REF" || {
            log "${YELLOW}⚠ Failed to deploy $func${NC}"
        }
    done
    
    log "${GREEN}✓ Edge functions deployed${NC}"
}

# Function to clear caches
clear_caches() {
    log "\n${BLUE}Clearing caches...${NC}"
    
    # Clear Redis cache
    redis-cli FLUSHDB || log "${YELLOW}⚠ Failed to clear Redis cache${NC}"
    
    # Clear CDN cache (if using Cloudflare)
    if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
        curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json" \
            --data '{"purge_everything":true}' || log "${YELLOW}⚠ Failed to clear CDN cache${NC}"
    fi
    
    log "${GREEN}✓ Caches cleared${NC}"
}

# Function to run post-deployment checks
post_deployment_checks() {
    log "\n${BLUE}Running post-deployment checks...${NC}"
    
    # Check application health
    ./scripts/health-check.sh || {
        log "${RED}Health check failed${NC}"
        return 1
    }
    
    # Check critical user flows
    npm run test:critical-flows || {
        log "${RED}Critical flow tests failed${NC}"
        return 1
    }
    
    log "${GREEN}✓ Post-deployment checks passed${NC}"
}

# Function to rollback
rollback() {
    log "\n${RED}Initiating rollback...${NC}"
    notify "Deployment failed, initiating rollback" "error"
    
    # Restore application
    if [ -f "$BACKUP_DIR/app-$DEPLOY_ID.tar.gz" ]; then
        rm -rf "$APP_DIR"
        mkdir -p "$APP_DIR"
        tar -xzf "$BACKUP_DIR/app-$DEPLOY_ID.tar.gz" -C "$APP_DIR"
        
        cd "$APP_DIR"
        pm2 restart blessed-horizon
        
        log "${GREEN}✓ Application rolled back${NC}"
    fi
    
    # Restore database if migrations were run
    if [ -f "$BACKUP_DIR/db-$DEPLOY_ID.sql.gz" ] && [ "${MIGRATIONS_RUN:-false}" = "true" ]; then
        log "Rolling back database..."
        gunzip -c "$BACKUP_DIR/db-$DEPLOY_ID.sql.gz" | psql "$DATABASE_URL"
        log "${GREEN}✓ Database rolled back${NC}"
    fi
    
    notify "Rollback completed" "warning"
}

# Main deployment flow
main() {
    log "=========================================="
    log "🚀 Blessed-Horizon Production Deployment"
    log "📅 Date: $(date)"
    log "🏷️  Deploy ID: $DEPLOY_ID"
    log "🌿 Branch: $BRANCH"
    log "=========================================="
    
    notify "Starting deployment from branch: $BRANCH" "info"
    
    # Set trap for rollback on error
    trap 'rollback' ERR
    
    # Execute deployment steps
    check_prerequisites
    create_backup
    deploy_application
    run_migrations && MIGRATIONS_RUN=true
    zero_downtime_deploy
    deploy_edge_functions
    clear_caches
    
    # Remove error trap
    trap - ERR
    
    # Run post-deployment checks
    if post_deployment_checks; then
        notify "Deployment completed successfully! 🎉" "success"
        log "\n${GREEN}✅ Deployment completed successfully!${NC}"
        log "📄 Deployment log: $DEPLOY_LOG"
        exit 0
    else
        rollback
        exit 1
    fi
}

# Run main function
main
