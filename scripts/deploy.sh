#!/bin/bash

# Semantest Enterprise Deployment Script
# Supports Docker, Kubernetes, and cloud platforms

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEPLOYMENT_TYPE="${1:-docker}"
ENVIRONMENT="${2:-production}"
NAMESPACE="${3:-semantest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    case $DEPLOYMENT_TYPE in
        "docker")
            if ! command -v docker &> /dev/null; then
                log_error "Docker is not installed"
                exit 1
            fi
            if ! command -v docker-compose &> /dev/null; then
                log_error "Docker Compose is not installed"
                exit 1
            fi
            ;;
        "kubernetes"|"k8s")
            if ! command -v kubectl &> /dev/null; then
                log_error "kubectl is not installed"
                exit 1
            fi
            if ! command -v helm &> /dev/null; then
                log_error "Helm is not installed"
                exit 1
            fi
            ;;
        "aws")
            if ! command -v aws &> /dev/null; then
                log_error "AWS CLI is not installed"
                exit 1
            fi
            if ! command -v kubectl &> /dev/null; then
                log_error "kubectl is not installed"
                exit 1
            fi
            ;;
        "azure")
            if ! command -v az &> /dev/null; then
                log_error "Azure CLI is not installed"
                exit 1
            fi
            if ! command -v kubectl &> /dev/null; then
                log_error "kubectl is not installed"
                exit 1
            fi
            ;;
        "gcp")
            if ! command -v gcloud &> /dev/null; then
                log_error "Google Cloud CLI is not installed"
                exit 1
            fi
            if ! command -v kubectl &> /dev/null; then
                log_error "kubectl is not installed"
                exit 1
            fi
            ;;
        *)
            log_error "Unsupported deployment type: $DEPLOYMENT_TYPE"
            log_info "Supported types: docker, kubernetes, aws, azure, gcp"
            exit 1
            ;;
    esac
    
    log_info "Prerequisites check passed"
}

# Build application
build_application() {
    log_info "Building Semantest application..."
    
    cd "$PROJECT_ROOT"
    
    # Build Docker image
    docker build -t semantest/enterprise:latest .
    
    # Tag for different environments
    case $ENVIRONMENT in
        "production")
            docker tag semantest/enterprise:latest semantest/enterprise:prod
            ;;
        "staging")
            docker tag semantest/enterprise:latest semantest/enterprise:staging
            ;;
        "development")
            docker tag semantest/enterprise:latest semantest/enterprise:dev
            ;;
    esac
    
    log_info "Application build completed"
}

# Deploy with Docker Compose
deploy_docker() {
    log_info "Deploying with Docker Compose..."
    
    cd "$PROJECT_ROOT"
    
    # Create environment file
    cat > .env << EOF
POSTGRES_PASSWORD=secure_password_123
REDIS_PASSWORD=secure_redis_password_123
GRAFANA_PASSWORD=secure_grafana_password_123
EOF
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    if docker-compose ps | grep -q "Up"; then
        log_info "Docker deployment completed successfully"
        log_info "Application available at: http://localhost:3000"
        log_info "Grafana available at: http://localhost:3001"
    else
        log_error "Docker deployment failed"
        docker-compose logs
        exit 1
    fi
}

# Deploy to Kubernetes
deploy_kubernetes() {
    log_info "Deploying to Kubernetes..."
    
    # Create namespace
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply Kubernetes manifests
    kubectl apply -f "$PROJECT_ROOT/k8s/namespace.yaml"
    kubectl apply -f "$PROJECT_ROOT/k8s/configmap.yaml"
    kubectl apply -f "$PROJECT_ROOT/k8s/secrets.yaml"
    kubectl apply -f "$PROJECT_ROOT/k8s/storage.yaml"
    kubectl apply -f "$PROJECT_ROOT/k8s/rbac.yaml"
    kubectl apply -f "$PROJECT_ROOT/k8s/deployment.yaml"
    kubectl apply -f "$PROJECT_ROOT/k8s/service.yaml"
    kubectl apply -f "$PROJECT_ROOT/k8s/ingress.yaml"
    
    # Wait for deployment to be ready
    log_info "Waiting for deployment to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/semantest-deployment -n "$NAMESPACE"
    
    # Get service status
    kubectl get services -n "$NAMESPACE"
    kubectl get ingress -n "$NAMESPACE"
    
    log_info "Kubernetes deployment completed successfully"
}

# Deploy to AWS
deploy_aws() {
    log_info "Deploying to AWS..."
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        exit 1
    fi
    
    # Deploy CloudFormation stack
    aws cloudformation deploy \
        --template-file "$PROJECT_ROOT/cloud/aws/cloudformation.yaml" \
        --stack-name "semantest-$ENVIRONMENT" \
        --parameter-overrides \
            Environment="$ENVIRONMENT" \
            KeyPairName="my-key-pair" \
            DomainName="semantest.com" \
            CertificateArn="arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012" \
            DatabasePassword="secure_password_123" \
            RedisPassword="secure_redis_password_123" \
        --capabilities CAPABILITY_IAM \
        --tags Environment="$ENVIRONMENT" Application="semantest"
    
    # Get EKS cluster name
    CLUSTER_NAME=$(aws cloudformation describe-stacks \
        --stack-name "semantest-$ENVIRONMENT" \
        --query 'Stacks[0].Outputs[?OutputKey==`EKSClusterName`].OutputValue' \
        --output text)
    
    # Update kubectl context
    aws eks update-kubeconfig --region us-east-1 --name "$CLUSTER_NAME"
    
    # Deploy to EKS
    deploy_kubernetes
    
    log_info "AWS deployment completed successfully"
}

# Deploy to Azure
deploy_azure() {
    log_info "Deploying to Azure..."
    
    # Check Azure login
    if ! az account show &> /dev/null; then
        log_error "Azure CLI not logged in"
        exit 1
    fi
    
    # Create resource group
    az group create --name "semantest-$ENVIRONMENT" --location "East US"
    
    # Deploy ARM template
    az deployment group create \
        --resource-group "semantest-$ENVIRONMENT" \
        --template-file "$PROJECT_ROOT/cloud/azure/arm-template.json" \
        --parameters \
            clusterName="semantest-$ENVIRONMENT" \
            sqlAdministratorLoginPassword="secure_password_123"
    
    # Get AKS credentials
    az aks get-credentials --resource-group "semantest-$ENVIRONMENT" --name "semantest-$ENVIRONMENT"
    
    # Deploy to AKS
    deploy_kubernetes
    
    log_info "Azure deployment completed successfully"
}

# Deploy to GCP
deploy_gcp() {
    log_info "Deploying to GCP..."
    
    # Check GCP authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 | grep -q "@"; then
        log_error "Google Cloud CLI not authenticated"
        exit 1
    fi
    
    # Set project
    PROJECT_ID=$(gcloud config get-value project)
    if [ -z "$PROJECT_ID" ]; then
        log_error "GCP project not set"
        exit 1
    fi
    
    # Deploy with Deployment Manager
    gcloud deployment-manager deployments create "semantest-$ENVIRONMENT" \
        --config "$PROJECT_ROOT/cloud/gcp/deployment.yaml" \
        --project "$PROJECT_ID"
    
    # Get GKE cluster name
    CLUSTER_NAME="semantest-cluster"
    CLUSTER_ZONE="us-central1-a"
    
    # Get GKE credentials
    gcloud container clusters get-credentials "$CLUSTER_NAME" --zone "$CLUSTER_ZONE" --project "$PROJECT_ID"
    
    # Deploy to GKE
    deploy_kubernetes
    
    log_info "GCP deployment completed successfully"
}

# Deploy with Helm
deploy_helm() {
    log_info "Deploying with Helm..."
    
    # Add Helm repositories
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    
    # Create namespace
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy with Helm
    helm upgrade --install semantest "$PROJECT_ROOT/k8s/helm" \
        --namespace "$NAMESPACE" \
        --set image.tag="latest" \
        --set environment="$ENVIRONMENT" \
        --set ingress.hosts[0].host="semantest.com" \
        --set postgresql.auth.password="secure_password_123" \
        --set redis.auth.password="secure_redis_password_123" \
        --wait --timeout=10m
    
    log_info "Helm deployment completed successfully"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    case $DEPLOYMENT_TYPE in
        "docker")
            if curl -f http://localhost:3000/api/health &> /dev/null; then
                log_info "Health check passed"
            else
                log_error "Health check failed"
                exit 1
            fi
            ;;
        "kubernetes"|"k8s"|"aws"|"azure"|"gcp")
            # Get service endpoint
            ENDPOINT=$(kubectl get ingress -n "$NAMESPACE" -o jsonpath='{.items[0].spec.rules[0].host}' 2>/dev/null || echo "localhost")
            if [ "$ENDPOINT" = "localhost" ]; then
                kubectl port-forward -n "$NAMESPACE" svc/semantest-service 8080:3000 &
                PORT_FORWARD_PID=$!
                sleep 5
                ENDPOINT="localhost:8080"
            fi
            
            if curl -f "http://$ENDPOINT/api/health" &> /dev/null; then
                log_info "Health check passed"
            else
                log_error "Health check failed"
                exit 1
            fi
            
            # Clean up port forward
            if [ -n "${PORT_FORWARD_PID:-}" ]; then
                kill "$PORT_FORWARD_PID" 2>/dev/null || true
            fi
            ;;
    esac
}

# Main deployment function
main() {
    log_info "Starting Semantest deployment..."
    log_info "Deployment type: $DEPLOYMENT_TYPE"
    log_info "Environment: $ENVIRONMENT"
    log_info "Namespace: $NAMESPACE"
    
    check_prerequisites
    build_application
    
    case $DEPLOYMENT_TYPE in
        "docker")
            deploy_docker
            ;;
        "kubernetes"|"k8s")
            deploy_kubernetes
            ;;
        "helm")
            deploy_helm
            ;;
        "aws")
            deploy_aws
            ;;
        "azure")
            deploy_azure
            ;;
        "gcp")
            deploy_gcp
            ;;
    esac
    
    health_check
    
    log_info "Deployment completed successfully!"
    log_info "For monitoring and troubleshooting:"
    log_info "  - Check logs: kubectl logs -n $NAMESPACE -l app=semantest"
    log_info "  - Check status: kubectl get pods -n $NAMESPACE"
    log_info "  - Port forward: kubectl port-forward -n $NAMESPACE svc/semantest-service 8080:3000"
}

# Usage information
usage() {
    echo "Usage: $0 [DEPLOYMENT_TYPE] [ENVIRONMENT] [NAMESPACE]"
    echo ""
    echo "DEPLOYMENT_TYPE:"
    echo "  docker      - Deploy with Docker Compose (default)"
    echo "  kubernetes  - Deploy to Kubernetes cluster"
    echo "  k8s         - Alias for kubernetes"
    echo "  helm        - Deploy with Helm charts"
    echo "  aws         - Deploy to AWS EKS"
    echo "  azure       - Deploy to Azure AKS"
    echo "  gcp         - Deploy to Google Cloud GKE"
    echo ""
    echo "ENVIRONMENT:"
    echo "  production  - Production environment (default)"
    echo "  staging     - Staging environment"
    echo "  development - Development environment"
    echo ""
    echo "NAMESPACE:"
    echo "  semantest   - Kubernetes namespace (default)"
    echo ""
    echo "Examples:"
    echo "  $0 docker"
    echo "  $0 kubernetes production"
    echo "  $0 aws production semantest"
    echo "  $0 helm staging"
}

# Handle command line arguments
if [ "$#" -eq 0 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    usage
    exit 0
fi

# Run main function
main "$@"