#!/bin/bash
# Scale Up Script for Blessed-Horizon
# Dynamically scales application instances based on load

set -euo pipefail

# Configuration
APP_NAME="blessed-horizon"
MIN_INSTANCES=2
MAX_INSTANCES=8
CPU_THRESHOLD=70
MEMORY_THRESHOLD=80

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to get current instance count
get_instance_count() {
    pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.instances" | head -1
}

# Function to get system metrics
get_system_metrics() {
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    MEMORY_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    
    echo "CPU: ${CPU_USAGE}%, Memory: ${MEMORY_USAGE}%"
}

# Function to scale instances
scale_instances() {
    local target_instances=$1
    
    echo -e "${BLUE}Scaling $APP_NAME to $target_instances instances...${NC}"
    
    pm2 scale "$APP_NAME" "$target_instances" || {
        echo -e "${RED}Failed to scale instances${NC}"
        exit 1
    }
    
    # Wait for instances to start
    sleep 5
    
    # Verify scaling
    local actual_instances=$(get_instance_count)
    if [ "$actual_instances" -eq "$target_instances" ]; then
        echo -e "${GREEN}✓ Successfully scaled to $target_instances instances${NC}"
    else
        echo -e "${YELLOW}⚠ Expected $target_instances instances, but got $actual_instances${NC}"
    fi
}

# Function to auto-scale based on metrics
auto_scale() {
    local current_instances=$(get_instance_count)
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print int($2)}')
    local memory_usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    
    echo -e "${BLUE}Current instances: $current_instances${NC}"
    echo -e "${BLUE}CPU Usage: ${cpu_usage}%${NC}"
    echo -e "${BLUE}Memory Usage: ${memory_usage}%${NC}"
    
    local target_instances=$current_instances
    
    # Scale up conditions
    if [ "$cpu_usage" -gt "$CPU_THRESHOLD" ] || [ "$memory_usage" -gt "$MEMORY_THRESHOLD" ]; then
        if [ "$current_instances" -lt "$MAX_INSTANCES" ]; then
            target_instances=$((current_instances + 1))
            echo -e "${YELLOW}High resource usage detected, scaling up${NC}"
        else
            echo -e "${YELLOW}Already at maximum instances ($MAX_INSTANCES)${NC}"
        fi
    fi
    
    # Scale down conditions
    if [ "$cpu_usage" -lt 30 ] && [ "$memory_usage" -lt 40 ] && [ "$current_instances" -gt "$MIN_INSTANCES" ]; then
        target_instances=$((current_instances - 1))
        echo -e "${YELLOW}Low resource usage detected, scaling down${NC}"
    fi
    
    # Apply scaling if needed
    if [ "$target_instances" -ne "$current_instances" ]; then
        scale_instances "$target_instances"
    else
        echo -e "${GREEN}No scaling needed${NC}"
    fi
}

# Function to show usage
usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  scale <number>    Scale to specific number of instances"
    echo "  auto              Auto-scale based on system metrics"
    echo "  status            Show current scaling status"
    echo "  up                Scale up by 1 instance"
    echo "  down              Scale down by 1 instance"
    echo ""
    echo "Examples:"
    echo "  $0 scale 4        Scale to 4 instances"
    echo "  $0 auto           Auto-scale based on CPU/memory"
    echo "  $0 status         Show current status"
    exit 1
}

# Main logic
if [ $# -eq 0 ]; then
    usage
fi

COMMAND=$1

case "$COMMAND" in
    scale)
        if [ $# -ne 2 ]; then
            echo -e "${RED}Please specify number of instances${NC}"
            exit 1
        fi
        
        TARGET=$2
        if ! [[ "$TARGET" =~ ^[0-9]+$ ]] || [ "$TARGET" -lt 1 ] || [ "$TARGET" -gt "$MAX_INSTANCES" ]; then
            echo -e "${RED}Invalid instance count. Must be between 1 and $MAX_INSTANCES${NC}"
            exit 1
        fi
        
        scale_instances "$TARGET"
        ;;
        
    auto)
        echo -e "${BLUE}Starting auto-scaling...${NC}"
        auto_scale
        ;;
        
    status)
        echo -e "${BLUE}=== Blessed-Horizon Scaling Status ===${NC}"
        echo ""
        
        INSTANCES=$(get_instance_count)
        echo -e "Current instances: ${GREEN}$INSTANCES${NC}"
        echo -e "Min instances: $MIN_INSTANCES"
        echo -e "Max instances: $MAX_INSTANCES"
        echo ""
        
        get_system_metrics
        echo ""
        
        # Show PM2 status
        pm2 show "$APP_NAME" | grep -E "status|cpu|memory|uptime|restarts"
        ;;
        
    up)
        CURRENT=$(get_instance_count)
        if [ "$CURRENT" -ge "$MAX_INSTANCES" ]; then
            echo -e "${YELLOW}Already at maximum instances ($MAX_INSTANCES)${NC}"
            exit 0
        fi
        
        NEW_COUNT=$((CURRENT + 1))
        scale_instances "$NEW_COUNT"
        ;;
        
    down)
        CURRENT=$(get_instance_count)
        if [ "$CURRENT" -le "$MIN_INSTANCES" ]; then
            echo -e "${YELLOW}Already at minimum instances ($MIN_INSTANCES)${NC}"
            exit 0
        fi
        
        NEW_COUNT=$((CURRENT - 1))
        scale_instances "$NEW_COUNT"
        ;;
        
    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}"
        usage
        ;;
esac
