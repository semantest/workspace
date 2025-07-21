#!/bin/bash

# Semantest WebSocket Server Deployment Script
# Usage: ./deploy.sh [environment] [version]
# Example: ./deploy.sh staging v1.0.0

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENVIRONMENT="${1:-staging}"
VERSION="${2:-latest}"
REGISTRY="${DOCKER_REGISTRY:-ghcr.io}"
IMAGE_PREFIX="${REGISTRY}/${GITHUB_REPOSITORY:-semantest/workspace}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $*"; }

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    # Check docker-compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check environment file
    if [[ ! -f "${PROJECT_ROOT}/deployments/environments/${ENVIRONMENT}.yaml" ]]; then
        error "Environment configuration not found: ${ENVIRONMENT}.yaml"
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Load environment configuration
load_environment() {
    log "Loading environment configuration for: ${ENVIRONMENT}"
    
    # Source environment-specific variables
    if [[ -f "${PROJECT_ROOT}/deploy/env/${ENVIRONMENT}.env" ]]; then
        set -a
        source "${PROJECT_ROOT}/deploy/env/${ENVIRONMENT}.env"
        set +a
    fi
    
    # Set deployment-specific variables
    export DEPLOYMENT_ENV="${ENVIRONMENT}"
    export DEPLOYMENT_VERSION="${VERSION}"
    export DEPLOYMENT_TIMESTAMP="$(date +%Y%m%d%H%M%S)"
}

# Pull Docker images
pull_images() {
    log "Pulling Docker images..."
    
    # Login to registry if credentials are available
    if [[ -n "${DOCKER_USERNAME:-}" ]] && [[ -n "${DOCKER_PASSWORD:-}" ]]; then
        echo "${DOCKER_PASSWORD}" | docker login "${REGISTRY}" -u "${DOCKER_USERNAME}" --password-stdin
    fi
    
    # Pull images
    docker pull "${IMAGE_PREFIX}/websocket-server:${VERSION}" || {
        error "Failed to pull websocket-server image"
        exit 1
    }
    
    log "Images pulled successfully"
}

# Deploy services
deploy_services() {
    log "Deploying services to ${ENVIRONMENT}..."
    
    cd "${PROJECT_ROOT}"
    
    # Use environment-specific compose file
    COMPOSE_FILE="docker-compose.yml"
    if [[ -f "docker-compose.${ENVIRONMENT}.yml" ]]; then
        COMPOSE_FILE="docker-compose.yml:docker-compose.${ENVIRONMENT}.yml"
    fi
    
    # Deploy with docker-compose
    export COMPOSE_FILE
    docker-compose up -d --remove-orphans
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 10
    
    # Check health
    if ! docker-compose exec -T websocket-server curl -f http://localhost:8080/health; then
        error "WebSocket server health check failed"
        docker-compose logs websocket-server
        exit 1
    fi
    
    log "Services deployed successfully"
}

# Run post-deployment checks
post_deployment_checks() {
    log "Running post-deployment checks..."
    
    # Check service status
    docker-compose ps
    
    # Run smoke tests
    if [[ -f "${PROJECT_ROOT}/deploy/tests/smoke-test.sh" ]]; then
        log "Running smoke tests..."
        "${PROJECT_ROOT}/deploy/tests/smoke-test.sh" "${ENVIRONMENT}"
    fi
    
    log "Post-deployment checks completed"
}

# Cleanup old deployments
cleanup() {
    log "Cleaning up old deployments..."
    
    # Remove unused images
    docker image prune -f --filter "until=168h"
    
    # Remove unused volumes (be careful!)
    # docker volume prune -f
    
    log "Cleanup completed"
}

# Rollback function
rollback() {
    error "Deployment failed, rolling back..."
    
    # Restore previous version
    if [[ -n "${PREVIOUS_VERSION:-}" ]]; then
        VERSION="${PREVIOUS_VERSION}"
        deploy_services
    fi
    
    exit 1
}

# Main deployment flow
main() {
    log "Starting deployment to ${ENVIRONMENT} with version ${VERSION}"
    
    # Set up error handling
    trap rollback ERR
    
    # Execute deployment steps
    check_prerequisites
    load_environment
    pull_images
    
    # Store current version for rollback
    PREVIOUS_VERSION=$(docker ps --filter "name=websocket-server" --format "{{.Image}}" | awk -F: '{print $2}' || echo "")
    
    deploy_services
    post_deployment_checks
    cleanup
    
    log "Deployment completed successfully!"
    log "Environment: ${ENVIRONMENT}"
    log "Version: ${VERSION}"
    log "Timestamp: ${DEPLOYMENT_TIMESTAMP}"
}

# Run main function
main "$@"