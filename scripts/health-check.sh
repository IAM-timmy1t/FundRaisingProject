#!/bin/bash
# Health Check Script for Blessed-Horizon
# This script performs comprehensive health checks on all system components

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-https://api.blessed-horizon.com}"
APP_URL="${APP_URL:-https://blessed-horizon.com}"
TIMEOUT=5

# Results tracking
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

# Log file
LOG_FILE="/var/log/blessed-horizon/health-check-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log and display
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Function to check endpoint
check_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    log "\n⏳ Checking $name..."
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT "$url" || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        log "${GREEN}✓ $name: OK (Status: $response)${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        log "${RED}✗ $name: FAILED (Expected: $expected_status, Got: $response)${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

# Function to check database
check_database() {
    local name="Database Connection"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    log "\n⏳ Checking $name..."
    
    if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
        # Check connection count
        connections=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM pg_stat_activity" 2>/dev/null | xargs)
        max_connections=$(psql "$DATABASE_URL" -t -c "SHOW max_connections" 2>/dev/null | xargs)
        
        usage=$((connections * 100 / max_connections))
        
        if [ "$usage" -lt 80 ]; then
            log "${GREEN}✓ $name: OK (Connections: $connections/$max_connections)${NC}"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        else
            log "${YELLOW}⚠ $name: WARNING (High connection usage: $connections/$max_connections)${NC}"
            WARNINGS=$((WARNINGS + 1))
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        fi
    else
        log "${RED}✗ $name: FAILED${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

# Function to check Redis
check_redis() {
    local name="Redis Connection"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    log "\n⏳ Checking $name..."
    
    if redis-cli ping > /dev/null 2>&1; then
        memory=$(redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
        log "${GREEN}✓ $name: OK (Memory: $memory)${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        log "${RED}✗ $name: FAILED${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

# Function to check disk space
check_disk_space() {
    local name="Disk Space"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    log "\n⏳ Checking $name..."
    
    usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -lt 80 ]; then
        log "${GREEN}✓ $name: OK (Usage: $usage%)${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    elif [ "$usage" -lt 90 ]; then
        log "${YELLOW}⚠ $name: WARNING (Usage: $usage%)${NC}"
        WARNINGS=$((WARNINGS + 1))
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        log "${RED}✗ $name: CRITICAL (Usage: $usage%)${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

# Function to check memory usage
check_memory() {
    local name="Memory Usage"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    log "\n⏳ Checking $name..."
    
    usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    
    if [ "$usage" -lt 80 ]; then
        log "${GREEN}✓ $name: OK (Usage: $usage%)${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    elif [ "$usage" -lt 90 ]; then
        log "${YELLOW}⚠ $name: WARNING (Usage: $usage%)${NC}"
        WARNINGS=$((WARNINGS + 1))
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        log "${RED}✗ $name: CRITICAL (Usage: $usage%)${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

# Function to check PM2 processes
check_pm2() {
    local name="PM2 Processes"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    log "\n⏳ Checking $name..."
    
    if pm2 list | grep -q "blessed-horizon"; then
        status=$(pm2 jlist | jq -r '.[] | select(.name=="blessed-horizon") | .pm2_env.status')
        
        if [ "$status" = "online" ]; then
            restarts=$(pm2 jlist | jq -r '.[] | select(.name=="blessed-horizon") | .pm2_env.restart_time')
            log "${GREEN}✓ $name: OK (Status: online, Restarts: $restarts)${NC}"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        else
            log "${RED}✗ $name: FAILED (Status: $status)${NC}"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        fi
    else
        log "${RED}✗ $name: NOT FOUND${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

# Function to check SSL certificate
check_ssl() {
    local name="SSL Certificate"
    local domain="blessed-horizon.com"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    log "\n⏳ Checking $name..."
    
    expiry=$(echo | openssl s_client -servername "$domain" -connect "$domain":443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    
    if [ -n "$expiry" ]; then
        expiry_epoch=$(date -d "$expiry" +%s)
        current_epoch=$(date +%s)
        days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
        
        if [ "$days_left" -gt 30 ]; then
            log "${GREEN}✓ $name: OK (Expires in $days_left days)${NC}"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        elif [ "$days_left" -gt 7 ]; then
            log "${YELLOW}⚠ $name: WARNING (Expires in $days_left days)${NC}"
            WARNINGS=$((WARNINGS + 1))
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        else
            log "${RED}✗ $name: CRITICAL (Expires in $days_left days)${NC}"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        fi
    else
        log "${RED}✗ $name: FAILED to check${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

# Function to check Stripe webhook
check_stripe_webhook() {
    local name="Stripe Webhook"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    log "\n⏳ Checking $name..."
    
    # Send test webhook
    response=$(curl -s -X POST "$API_URL/webhooks/stripe/test" \
        -H "Content-Type: application/json" \
        -H "Stripe-Signature: test" \
        -d '{"type":"test","data":{}}' \
        -w "%{http_code}" -o /dev/null || echo "000")
    
    if [ "$response" = "200" ] || [ "$response" = "400" ]; then
        log "${GREEN}✓ $name: OK (Endpoint responding)${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        log "${RED}✗ $name: FAILED (Status: $response)${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

# Main health check execution
main() {
    log "==========================================="
    log "🏥 Blessed-Horizon Health Check"
    log "📅 Date: $(date)"
    log "==========================================="
    
    # API Endpoints
    log "\n📡 Checking API Endpoints..."
    check_endpoint "API Health" "$API_URL/health"
    check_endpoint "API Version" "$API_URL/version"
    check_endpoint "Campaign List" "$API_URL/api/v1/campaigns"
    check_endpoint "Auth Status" "$API_URL/api/v1/auth/status" 401
    
    # Application Endpoints
    log "\n🌐 Checking Application Endpoints..."
    check_endpoint "Homepage" "$APP_URL"
    check_endpoint "Login Page" "$APP_URL/login"
    check_endpoint "Campaigns Page" "$APP_URL/campaigns"
    check_endpoint "Static Assets" "$APP_URL/static/js/main.js"
    
    # Infrastructure
    log "\n🏗️ Checking Infrastructure..."
    check_database
    check_redis
    check_disk_space
    check_memory
    check_pm2
    check_ssl
    
    # Integrations
    log "\n🔌 Checking Integrations..."
    check_stripe_webhook
    
    # Edge Functions
    log "\n⚡ Checking Edge Functions..."
    check_endpoint "Payment Webhook" "$API_URL/functions/v1/payment-webhook" 401
    check_endpoint "Trust Score Update" "$API_URL/functions/v1/trust-score-update" 401
    check_endpoint "Content Moderation" "$API_URL/functions/v1/content-moderation" 401
    
    # Summary
    log "\n==========================================="
    log "📊 Health Check Summary"
    log "==========================================="
    log "Total Checks: $TOTAL_CHECKS"
    log "${GREEN}Passed: $PASSED_CHECKS${NC}"
    log "${YELLOW}Warnings: $WARNINGS${NC}"
    log "${RED}Failed: $FAILED_CHECKS${NC}"
    
    # Overall status
    if [ "$FAILED_CHECKS" -eq 0 ]; then
        log "\n${GREEN}✅ Overall Status: HEALTHY${NC}"
        exit_code=0
    elif [ "$FAILED_CHECKS" -le 2 ]; then
        log "\n${YELLOW}⚠️  Overall Status: DEGRADED${NC}"
        exit_code=1
    else
        log "\n${RED}❌ Overall Status: UNHEALTHY${NC}"
        exit_code=2
    fi
    
    log "\n📄 Full log saved to: $LOG_FILE"
    
    # Send notification if unhealthy
    if [ "$exit_code" -ne 0 ]; then
        # Send alert (implement your notification method)
        log "\n🚨 Sending alert notification..."
        # Example: curl -X POST $SLACK_WEBHOOK -d "{\"text\":\"Health check failed! Status: $exit_code\"}"
    fi
    
    exit $exit_code
}

# Run main function
main
