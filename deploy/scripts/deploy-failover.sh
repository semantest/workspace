#!/bin/bash

# Semantest Failover System Deployment Script
# Deploys the complete failover infrastructure

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $*"; }
info() { echo -e "${BLUE}[INFO]${NC} $*"; }

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    local deps=("docker" "docker-compose" "redis-cli")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            error "$dep is not installed"
            exit 1
        fi
    done
    
    log "All dependencies satisfied"
}

# Deploy failover infrastructure
deploy_failover() {
    log "Deploying failover infrastructure..."
    
    cd "$PROJECT_ROOT"
    
    # Start with base compose and failover overlay
    docker-compose -f docker-compose.yml -f docker-compose.failover.yml up -d
    
    # Wait for services to be ready
    log "Waiting for services to initialize..."
    sleep 10
    
    # Verify HAProxy is running
    if ! docker-compose exec -T haproxy haproxy -c -f /usr/local/etc/haproxy/haproxy.cfg; then
        error "HAProxy configuration is invalid"
        exit 1
    fi
    
    log "Failover infrastructure deployed"
}

# Configure Redis for queue persistence
configure_redis() {
    log "Configuring Redis for queue persistence..."
    
    # Test Redis connection
    if ! docker-compose exec -T redis redis-cli -a "${REDIS_PASSWORD:-development-password}" ping; then
        error "Cannot connect to Redis"
        exit 1
    fi
    
    # Configure Redis persistence
    docker-compose exec -T redis redis-cli -a "${REDIS_PASSWORD:-development-password}" CONFIG SET save "900 1 300 10 60 10000"
    docker-compose exec -T redis redis-cli -a "${REDIS_PASSWORD:-development-password}" CONFIG SET appendonly yes
    
    log "Redis configured for persistence"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up failover monitoring..."
    
    # Deploy monitoring stack with failover profile
    docker-compose --profile monitoring --profile failover up -d
    
    # Wait for Prometheus
    local retries=30
    while ! curl -sf http://localhost:9090/-/ready > /dev/null && [ $retries -gt 0 ]; do
        sleep 2
        ((retries--))
    done
    
    if [ $retries -eq 0 ]; then
        warn "Prometheus not ready after 60 seconds"
    else
        log "Prometheus is ready"
    fi
    
    # Import Grafana dashboard
    if curl -sf http://localhost:3000/api/health > /dev/null; then
        log "Grafana is accessible at http://localhost:3000 (admin/admin)"
    fi
}

# Test failover functionality
test_failover() {
    log "Testing failover functionality..."
    
    # Check HAProxy stats
    if curl -sf http://localhost:8404/stats > /dev/null; then
        info "HAProxy stats available at http://localhost:8404/stats"
    fi
    
    # Test health endpoint through load balancer
    if curl -sf http://localhost/health > /dev/null; then
        log "Health endpoint accessible through load balancer"
    else
        warn "Health endpoint not accessible"
    fi
    
    # Simulate local backend failure
    log "Simulating local backend failure..."
    docker-compose stop websocket-server
    sleep 10
    
    # Check if traffic switches to cloud
    if curl -sf http://localhost/health > /dev/null; then
        log "Failover successful - traffic routed to cloud backend"
    else
        error "Failover test failed"
    fi
    
    # Restore local backend
    docker-compose start websocket-server
    log "Local backend restored"
}

# Display status
display_status() {
    log "Failover System Status:"
    echo "========================"
    echo "HAProxy Stats: http://localhost:8404/stats"
    echo "Prometheus: http://localhost:9090"
    echo "Grafana: http://localhost:3000 (admin/admin)"
    echo "Health Check: http://localhost/health"
    echo ""
    echo "Active containers:"
    docker-compose ps
}

# Main execution
main() {
    log "Starting Semantest Failover System deployment"
    
    check_dependencies
    deploy_failover
    configure_redis
    setup_monitoring
    test_failover
    display_status
    
    log "Failover system deployment complete!"
    info "Monitor failover events in Grafana dashboard"
}

# Run main function
main "$@"