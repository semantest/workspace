#!/bin/bash

# Production Deployment Script for Real-Time Platform
# Supports 1M+ concurrent connections with auto-scaling

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${ENVIRONMENT:-production}
WORKERS=${WORKERS:-8}
MAX_CONNECTIONS=${MAX_CONNECTIONS:-1000000}
MAX_CONNECTIONS_PER_WORKER=${MAX_CONNECTIONS_PER_WORKER:-50000}
DEPLOYMENT_MODE=${DEPLOYMENT_MODE:-docker-compose}

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validation functions
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "curl" "jq")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Required command '$cmd' not found"
            exit 1
        fi
    done
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check available memory (minimum 8GB recommended)
    local available_memory=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    if [ "$available_memory" -lt 8192 ]; then
        log_warning "Available memory ($available_memory MB) is less than recommended 8GB"
    fi
    
    # Check available disk space (minimum 10GB)
    local available_disk=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$available_disk" -lt 10 ]; then
        log_error "Available disk space ($available_disk GB) is less than required 10GB"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Environment setup
setup_environment() {
    log_info "Setting up environment..."
    
    # Create necessary directories
    mkdir -p logs monitoring/prometheus monitoring/grafana/dashboards monitoring/grafana/datasources monitoring/logstash/pipeline
    
    # Set proper permissions
    chmod 755 logs
    
    # Generate environment file
    cat > .env.production << EOF
# Environment Configuration
NODE_ENV=${ENVIRONMENT}
WORKERS=${WORKERS}
MAX_CONNECTIONS=${MAX_CONNECTIONS}
MAX_CONNECTIONS_PER_WORKER=${MAX_CONNECTIONS_PER_WORKER}

# Auto-scaling
AUTO_SCALING=true
SCALE_UP_THRESHOLD=0.8
SCALE_DOWN_THRESHOLD=0.3

# Performance targets
CPU_TARGET=70
MEMORY_TARGET=80
CONNECTION_TARGET=40000
LATENCY_TARGET=100

# Monitoring
MONITORING_ENABLED=true
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
LOG_LEVEL=info

# Health and reliability
HEALTH_CHECK_INTERVAL=10000
SHUTDOWN_TIMEOUT=30000
CIRCUIT_BREAKER_ENABLED=true
RETRY_ENABLED=true

# Redis Cluster Configuration
REDIS_CLUSTER_NODES=redis-1:7001,redis-2:7002,redis-3:7003,redis-4:7004,redis-5:7005,redis-6:7006
REDIS_URL=redis://redis-1:7001

# Kafka Cluster Configuration
KAFKA_BROKERS=kafka-1:29092,kafka-2:29093,kafka-3:29094
EOF
    
    log_success "Environment setup completed"
}

# Monitoring configuration
setup_monitoring() {
    log_info "Setting up monitoring configuration..."
    
    # Prometheus configuration
    cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'realtime-platform'
    static_configs:
      - targets: ['realtime-platform:9091']
    scrape_interval: 5s
    metrics_path: /metrics

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-1:7001', 'redis-2:7002', 'redis-3:7003']
    scrape_interval: 15s

  - job_name: 'kafka'
    static_configs:
      - targets: ['kafka-1:29092', 'kafka-2:29093', 'kafka-3:29094']
    scrape_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
EOF
    
    # Grafana datasource configuration
    cat > monitoring/grafana/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF
    
    # Basic Grafana dashboard
    cat > monitoring/grafana/dashboards/realtime-platform.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "Real-Time Platform",
    "tags": ["realtime", "websocket", "kafka", "redis"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Active Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "realtime_cluster_connections",
            "legendFormat": "Total Connections"
          }
        ]
      },
      {
        "id": 2,
        "title": "Message Throughput",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(realtime_messages[5m])",
            "legendFormat": "{{type}}"
          }
        ]
      },
      {
        "id": 3,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "realtime_process_memory_bytes",
            "legendFormat": "{{type}}"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
EOF
    
    # Logstash pipeline configuration
    cat > monitoring/logstash/pipeline/logstash.conf << 'EOF'
input {
  file {
    path => "/var/log/app/*.log"
    start_position => "beginning"
    codec => json
  }
}

filter {
  if [level] == "error" {
    mutate {
      add_tag => ["error"]
    }
  }
  
  if [level] == "warn" {
    mutate {
      add_tag => ["warning"]
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "realtime-platform-%{+YYYY.MM.dd}"
  }
}
EOF
    
    log_success "Monitoring configuration completed"
}

# System optimization
optimize_system() {
    log_info "Applying system optimizations..."
    
    # Check if running with sufficient privileges
    if [ "$EUID" -eq 0 ]; then
        # Kernel parameters for high-performance networking
        cat >> /etc/sysctl.conf << 'EOF'
# Real-Time Platform Optimizations
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.core.rmem_default = 262144
net.core.rmem_max = 16777216
net.core.wmem_default = 262144
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_slow_start_after_idle = 0
fs.file-max = 1000000
EOF
        
        # Apply sysctl settings
        sysctl -p
        
        # Increase file descriptor limits
        cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 1000000
* hard nofile 1000000
EOF
        
        log_success "System optimizations applied (requires reboot to take full effect)"
    else
        log_warning "Not running as root - skipping system optimizations"
        log_info "For optimal performance, run the following as root:"
        log_info "echo 'net.core.somaxconn = 65535' >> /etc/sysctl.conf"
        log_info "sysctl -p"
    fi
}

# Build and deploy
build_and_deploy() {
    log_info "Building and deploying Real-Time Platform..."
    
    # Stop existing deployment
    if docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
        log_info "Stopping existing deployment..."
        docker-compose -f docker-compose.production.yml down
    fi
    
    # Build images
    log_info "Building Docker images..."
    docker-compose -f docker-compose.production.yml build --no-cache
    
    # Initialize Redis cluster
    log_info "Starting Redis cluster..."
    docker-compose -f docker-compose.production.yml up -d redis-1 redis-2 redis-3 redis-4 redis-5 redis-6
    
    # Wait for Redis nodes to be ready
    sleep 30
    
    # Create Redis cluster
    log_info "Creating Redis cluster..."
    docker exec -it $(docker-compose -f docker-compose.production.yml ps -q redis-1) \
        redis-cli --cluster create \
        redis-1:7001 redis-2:7002 redis-3:7003 redis-4:7004 redis-5:7005 redis-6:7006 \
        --cluster-replicas 1 --cluster-yes || log_warning "Redis cluster may already exist"
    
    # Start Kafka cluster
    log_info "Starting Kafka cluster..."
    docker-compose -f docker-compose.production.yml up -d zookeeper kafka-1 kafka-2 kafka-3
    
    # Wait for Kafka to be ready
    sleep 60
    
    # Start the main platform
    log_info "Starting Real-Time Platform..."
    docker-compose -f docker-compose.production.yml up -d realtime-platform
    
    # Start monitoring (if enabled)
    if [ "${MONITORING_ENABLED:-true}" = "true" ]; then
        log_info "Starting monitoring services..."
        docker-compose -f docker-compose.production.yml --profile monitoring up -d
    fi
    
    log_success "Deployment completed"
}

# Health checks
perform_health_checks() {
    log_info "Performing health checks..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:9090/health &> /dev/null; then
            log_success "Platform health check passed"
            break
        fi
        
        attempt=$((attempt + 1))
        log_info "Health check attempt $attempt/$max_attempts..."
        sleep 10
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "Health check failed after $max_attempts attempts"
        return 1
    fi
    
    # Get detailed status
    log_info "Platform status:"
    curl -s http://localhost:9090/status | jq '.'
    
    # Test WebSocket connection
    log_info "Testing WebSocket connection..."
    if command -v wscat &> /dev/null; then
        echo '{"type":"test","payload":{"message":"deployment test"}}' | \
            timeout 5 wscat -c ws://localhost:8080 || log_warning "WebSocket test failed (wscat required)"
    else
        log_warning "wscat not found - skipping WebSocket test"
    fi
}

# Load testing
run_load_test() {
    if [ "$1" = "--load-test" ]; then
        log_info "Running load test..."
        docker-compose -f docker-compose.production.yml --profile testing up load-tester
    fi
}

# Show status and URLs
show_deployment_info() {
    log_success "🚀 Real-Time Platform Deployment Complete!"
    echo
    echo "📊 Service URLs:"
    echo "  Platform:         http://localhost:8080"
    echo "  Health Check:     http://localhost:9090/health"
    echo "  Metrics:          http://localhost:9091/metrics"
    echo "  Prometheus:       http://localhost:9090"
    echo "  Grafana:          http://localhost:3000 (admin/admin123)"
    echo "  Kibana:           http://localhost:5601"
    echo
    echo "🔧 Configuration:"
    echo "  Environment:      $ENVIRONMENT"
    echo "  Workers:          $WORKERS"
    echo "  Max Connections:  $MAX_CONNECTIONS"
    echo "  Per Worker:       $MAX_CONNECTIONS_PER_WORKER"
    echo
    echo "📈 Monitoring:"
    echo "  Auto-scaling:     Enabled"
    echo "  Circuit Breaker:  Enabled"
    echo "  Health Checks:    Every 10s"
    echo
    echo "🛠️  Management Commands:"
    echo "  Status:           docker-compose -f docker-compose.production.yml ps"
    echo "  Logs:             docker-compose -f docker-compose.production.yml logs -f realtime-platform"
    echo "  Scale:            docker-compose -f docker-compose.production.yml up --scale realtime-platform=N"
    echo "  Stop:             docker-compose -f docker-compose.production.yml down"
    echo
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    docker-compose -f docker-compose.production.yml down --volumes
    docker system prune -f
}

# Main deployment function
main() {
    log_info "🚀 Starting Real-Time Platform Production Deployment"
    log_info "Target: $MAX_CONNECTIONS concurrent connections with $WORKERS workers"
    
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            setup_environment
            setup_monitoring
            optimize_system
            build_and_deploy
            perform_health_checks
            show_deployment_info
            ;;
        "health")
            perform_health_checks
            ;;
        "status")
            curl -s http://localhost:9090/status | jq '.'
            ;;
        "logs")
            docker-compose -f docker-compose.production.yml logs -f realtime-platform
            ;;
        "metrics")
            curl -s http://localhost:9091/metrics
            ;;
        "scale")
            local replicas=${2:-2}
            log_info "Scaling to $replicas replicas..."
            docker-compose -f docker-compose.production.yml up --scale realtime-platform=$replicas -d
            ;;
        "stop")
            log_info "Stopping Real-Time Platform..."
            docker-compose -f docker-compose.production.yml down
            ;;
        "cleanup")
            cleanup
            ;;
        "load-test")
            run_load_test --load-test
            ;;
        *)
            echo "Usage: $0 {deploy|health|status|logs|metrics|scale [N]|stop|cleanup|load-test}"
            echo
            echo "Commands:"
            echo "  deploy      Full deployment (default)"
            echo "  health      Check platform health"
            echo "  status      Show detailed status"
            echo "  logs        Show platform logs"
            echo "  metrics     Show Prometheus metrics"
            echo "  scale [N]   Scale to N replicas"
            echo "  stop        Stop platform"
            echo "  cleanup     Stop and remove all data"
            echo "  load-test   Run load testing"
            exit 1
            ;;
    esac
}

# Handle interrupts
trap cleanup EXIT INT TERM

# Run main function with all arguments
main "$@"