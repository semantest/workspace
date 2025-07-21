# Semantest WebSocket Server Deployment Guide

This directory contains deployment configurations and scripts for the Semantest WebSocket Server.

## Directory Structure

```
deploy/
├── scripts/           # Deployment scripts
├── env/              # Environment configuration files
├── k8s/              # Kubernetes manifests
│   ├── base/         # Base Kubernetes resources
│   └── overlays/     # Environment-specific overlays
└── tests/            # Deployment tests
```

## Quick Start

### Local Development with Docker Compose

```bash
# Start services
docker-compose up -d

# Check health
curl http://localhost:8080/health

# View logs
docker-compose logs -f websocket-server

# Stop services
docker-compose down
```

### Kubernetes Deployment

#### Development Environment

```bash
# Apply development configuration
kubectl apply -k deploy/k8s/overlays/development

# Check deployment
kubectl -n semantest-dev get pods
kubectl -n semantest-dev logs -f deployment/websocket-server
```

#### Staging Environment

```bash
# Deploy to staging
./deploy/scripts/deploy.sh staging v1.0.0

# Or use kubectl directly
kubectl apply -k deploy/k8s/overlays/staging
```

#### Production Environment

```bash
# Deploy to production (requires confirmation)
./deploy/scripts/deploy-production.sh v1.0.0

# Or use kubectl with specific version
cd deploy/k8s/overlays/production
kustomize edit set image ghcr.io/semantest/workspace/websocket-server:v1.0.0
kubectl apply -k .
```

## Deployment Scripts

### deploy.sh
General-purpose deployment script for non-production environments.

```bash
./deploy/scripts/deploy.sh [environment] [version]
```

### deploy-production.sh
Production deployment with additional safety checks and validations.

```bash
./deploy/scripts/deploy-production.sh [version] [--force]
```

## Environment Configuration

Environment-specific configurations are stored in `deploy/env/`:
- `development.env` - Local development settings
- `staging.env` - Staging environment settings  
- `production.env` - Production environment settings

## Kubernetes Resources

### Base Resources
- **Deployment**: WebSocket server pods with health checks
- **Service**: ClusterIP service for internal communication
- **ConfigMap**: Application configuration
- **PVC**: Persistent storage for data
- **Ingress**: External access with WebSocket support
- **HPA**: Horizontal Pod Autoscaler for scaling
- **PDB**: Pod Disruption Budget for high availability

### Environment Overlays
- **Development**: Single replica, debug mode, relaxed security
- **Staging**: Multiple replicas, moderate resources, testing features
- **Production**: High availability, autoscaling, strict security

## Monitoring

The deployment includes:
- Prometheus metrics endpoint at `/metrics`
- Health check endpoint at `/health`
- Grafana dashboards (when monitoring profile is enabled)
- Distributed tracing with Jaeger

## Security Considerations

1. **Secrets Management**: Never commit actual secrets. Use Kubernetes secrets or external secret management.
2. **TLS/SSL**: Production deployments must use HTTPS/WSS with valid certificates.
3. **Network Policies**: Implement appropriate network policies in production.
4. **RBAC**: Configure proper Kubernetes RBAC for service accounts.

## Troubleshooting

### Check Pod Status
```bash
kubectl -n [namespace] get pods
kubectl -n [namespace] describe pod [pod-name]
```

### View Logs
```bash
kubectl -n [namespace] logs -f deployment/websocket-server
```

### Test WebSocket Connection
```bash
# Using wscat
wscat -c ws://localhost:8080

# Using curl
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
     http://localhost:8080
```

### Run Smoke Tests
```bash
./deploy/tests/smoke-test.sh [environment]
```

## CI/CD Integration

The deployment is integrated with GitHub Actions:
- Automatic builds on push to main/develop
- Docker image creation and registry push
- Automated testing and security scanning
- Environment-specific deployments

See `.github/workflows/websocket-server-ci.yml` for details.