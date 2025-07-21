#!/bin/bash
# Production Monitoring Dashboard Setup
# Sets up a comprehensive monitoring dashboard using tmux

set -euo pipefail

# Configuration
SESSION_NAME="blessed-horizon-monitor"
API_URL="${API_URL:-https://api.blessed-horizon.com}"
LOG_DIR="/var/log/blessed-horizon"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if tmux session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Monitoring session already exists. Attaching..."
    tmux attach -t "$SESSION_NAME"
    exit 0
fi

echo -e "${GREEN}Setting up Blessed-Horizon monitoring dashboard...${NC}"

# Create new tmux session
tmux new-session -d -s "$SESSION_NAME" -n "Overview"

# Window 1: System Overview
tmux send-keys -t "$SESSION_NAME:Overview" 'htop' C-m

# Window 2: Application Logs
tmux new-window -t "$SESSION_NAME" -n "App-Logs"
tmux send-keys -t "$SESSION_NAME:App-Logs" 'pm2 logs --lines 100' C-m

# Window 3: Error Monitoring
tmux new-window -t "$SESSION_NAME" -n "Errors"
tmux send-keys -t "$SESSION_NAME:Errors" "tail -f $LOG_DIR/error.log | grep -E 'ERROR|CRITICAL|FATAL' --color=always" C-m

# Window 4: Database Monitoring
tmux new-window -t "$SESSION_NAME" -n "Database"
tmux send-keys -t "$SESSION_NAME:Database" 'watch -n 2 "psql $DATABASE_URL -c \"SELECT pid, usename, application_name, state, query_start, NOW() - query_start as duration, query FROM pg_stat_activity WHERE state != '"'"'idle'"'"' ORDER BY query_start DESC LIMIT 10;\""' C-m

# Window 5: API Monitoring
tmux new-window -t "$SESSION_NAME" -n "API"
tmux send-keys -t "$SESSION_NAME:API" "watch -n 5 './scripts/api-monitor.sh'" C-m

# Window 6: Nginx Access Logs
tmux new-window -t "$SESSION_NAME" -n "Access-Logs"
tmux send-keys -t "$SESSION_NAME:Access-Logs" 'tail -f /var/log/nginx/access.log | grep -v "health" | awk '"'"'{print $1, $4, $5, $7, $9}'"'"'' C-m

# Window 7: Redis Monitoring
tmux new-window -t "$SESSION_NAME" -n "Redis"
tmux send-keys -t "$SESSION_NAME:Redis" 'redis-cli monitor' C-m

# Window 8: Health Checks
tmux new-window -t "$SESSION_NAME" -n "Health"
tmux send-keys -t "$SESSION_NAME:Health" 'watch -n 30 "./scripts/health-check.sh"' C-m

# Create API monitoring script if it doesn't exist
cat > ./scripts/api-monitor.sh << 'EOF'
#!/bin/bash
# API Monitoring Script

API_URL="${API_URL:-https://api.blessed-horizon.com}"

echo "=== API Monitoring Dashboard ==="
echo "Time: $(date)"
echo ""

# Response times
echo "📊 Response Times (last 5 minutes):"
curl -s "$API_URL/metrics/response-times" 2>/dev/null | jq '.' || echo "Failed to fetch"

echo ""
echo "📈 Request Rate:"
curl -s "$API_URL/metrics/request-rate" 2>/dev/null | jq '.' || echo "Failed to fetch"

echo ""
echo "❌ Error Rate:"
curl -s "$API_URL/metrics/error-rate" 2>/dev/null | jq '.' || echo "Failed to fetch"

echo ""
echo "🔄 Active Connections:"
ss -tn state established '( dport = :443 or dport = :80 )' | wc -l

echo ""
echo "💰 Recent Donations (last hour):"
curl -s "$API_URL/metrics/donations/recent" 2>/dev/null | jq '.' || echo "Failed to fetch"
EOF

chmod +x ./scripts/api-monitor.sh

# Create pane layout for overview window
tmux select-window -t "$SESSION_NAME:Overview"
tmux split-window -h -p 50
tmux send-keys 'watch -n 1 "free -h && echo && df -h"' C-m

tmux split-window -v -p 50
tmux send-keys 'iostat -x 1' C-m

tmux select-pane -t 0
tmux split-window -v -p 30
tmux send-keys 'pm2 monit' C-m

# Set default window
tmux select-window -t "$SESSION_NAME:Overview"

echo -e "${GREEN}✅ Monitoring dashboard setup complete!${NC}"
echo ""
echo "📺 To view the dashboard, run:"
echo -e "${YELLOW}tmux attach -t $SESSION_NAME${NC}"
echo ""
echo "🔑 Tmux shortcuts:"
echo "  - Switch windows: Ctrl+b, [number]"
echo "  - Next window: Ctrl+b, n"
echo "  - Previous window: Ctrl+b, p"
echo "  - Detach: Ctrl+b, d"
echo "  - Split horizontal: Ctrl+b, %"
echo "  - Split vertical: Ctrl+b, \""
echo "  - Switch panes: Ctrl+b, arrow keys"

# Attach to session
tmux attach -t "$SESSION_NAME"
