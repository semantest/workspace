---
id: docker
title: Docker Deployment
sidebar_label: Docker
---

# Docker Deployment Guide

Deploy Semantest using Docker for consistent, reproducible environments across development, staging, and production.

## Prerequisites

- Docker 20.10+ installed
- Docker Compose 2.0+ (optional, for multi-container setup)
- 4GB RAM minimum (8GB recommended)
- 10GB disk space

## Quick Start

### Using Docker Compose

```bash
# Clone the repository
git clone https://github.com/semantest/workspace
cd workspace

# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### Using Individual Containers

```bash
# Pull official images
docker pull semantest/server:latest
docker pull semantest/extension-builder:latest

# Run WebSocket server
docker run -d \
  --name semantest-server \
  -p 3000:3000 \
  -e NODE_ENV=production \
  semantest/server:latest

# Build Chrome extension
docker run --rm \
  -v $(pwd)/extension.chrome:/app \
  -v $(pwd)/dist:/app/dist \
  semantest/extension-builder:latest
```

## Complete Docker Compose Setup

### docker-compose.yml

```yaml
version: '3.8'

services:
  # WebSocket Server
  websocket:
    image: semantest/server:latest
    container_name: semantest-websocket
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - LOG_LEVEL=info
    depends_on:
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis for session management
  redis:
    image: redis:7-alpine
    container_name: semantest-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # PostgreSQL for event store
  postgres:
    image: postgres:15-alpine
    container_name: semantest-postgres
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=semantest
      - POSTGRES_USER=semantest
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U semantest"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx reverse proxy
  nginx:
    image: nginx:alpine
    container_name: semantest-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - websocket
    restart: unless-stopped

volumes:
  redis-data:
  postgres-data:
```

### Environment Configuration

Create `.env` file:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000

# Authentication
JWT_SECRET=your-super-secret-jwt-key
API_KEY_SECRET=your-api-key-secret

# Database
POSTGRES_PASSWORD=secure-postgres-password
DATABASE_URL=postgresql://semantest:secure-postgres-password@postgres:5432/semantest

# Redis
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=optional-redis-password

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-new-relic-key
```

## Custom Docker Images

### Server Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY lerna.json ./
COPY packages/ ./packages/

# Install dependencies
RUN npm ci --only=production

# Build all packages
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install production dependencies
RUN apk add --no-cache tini curl

# Copy built application
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["tini", "--"]
CMD ["node", "packages/server/dist/index.js"]
```

### Extension Builder Dockerfile

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install Chrome dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Install build tools
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copy extension source
COPY . .

# Install dependencies
RUN npm ci

# Build extension
RUN npm run build:production

# Output stage
FROM alpine:latest
COPY --from=builder /app/dist /dist
```

## Deployment Configurations

### Development

```bash
# Start with hot reload
docker-compose -f docker-compose.dev.yml up

# docker-compose.dev.yml
version: '3.8'

services:
  websocket:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - ./packages:/app/packages
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DEBUG=semantest:*
    command: npm run dev
```

### Production

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d

# Enable Swarm mode for scaling
docker swarm init
docker stack deploy -c docker-compose.prod.yml semantest
```

### High Availability

```yaml
# docker-compose.ha.yml
version: '3.8'

services:
  websocket:
    image: semantest/server:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
      placement:
        constraints:
          - node.role == worker
    networks:
      - semantest-net

  redis:
    image: redis:7-alpine
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
    networks:
      - semantest-net

networks:
  semantest-net:
    driver: overlay
    attachable: true
```

## Monitoring and Logging

### Prometheus Integration

```yaml
# Add to docker-compose.yml
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
    - prometheus-data:/prometheus
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana:latest
  ports:
    - "3001:3000"
  volumes:
    - grafana-data:/var/lib/grafana
    - ./grafana/provisioning:/etc/grafana/provisioning
```

### ELK Stack

```yaml
# Add for centralized logging
elasticsearch:
  image: elasticsearch:8.10.0
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=false
  volumes:
    - elastic-data:/usr/share/elasticsearch/data

logstash:
  image: logstash:8.10.0
  volumes:
    - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf

kibana:
  image: kibana:8.10.0
  ports:
    - "5601:5601"
```

## Security Considerations

### 1. Network Isolation

```yaml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
```

### 2. Secrets Management

```bash
# Use Docker secrets
echo "mysecret" | docker secret create jwt_secret -

# Reference in compose
services:
  websocket:
    secrets:
      - jwt_secret
    environment:
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
```

### 3. Image Scanning

```bash
# Scan images for vulnerabilities
docker scan semantest/server:latest

# Use Trivy for detailed scanning
trivy image semantest/server:latest
```

## Maintenance

### Backup

```bash
# Backup volumes
docker run --rm \
  -v semantest_postgres-data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/postgres-$(date +%Y%m%d).tar.gz -C /data .

# Restore volumes
docker run --rm \
  -v semantest_postgres-data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar xzf /backup/postgres-20240125.tar.gz -C /data
```

### Updates

```bash
# Pull latest images
docker-compose pull

# Rolling update
docker-compose up -d --no-deps --scale websocket=2 websocket
docker-compose up -d --no-deps websocket
```

### Cleanup

```bash
# Remove unused containers
docker container prune -f

# Remove unused images
docker image prune -a -f

# Remove unused volumes
docker volume prune -f

# Complete cleanup
docker system prune -a --volumes -f
```

## Troubleshooting

### Container Logs

```bash
# View specific service logs
docker-compose logs -f websocket

# View with timestamps
docker-compose logs -t

# Limit output
docker-compose logs --tail=100
```

### Container Access

```bash
# Execute commands in container
docker-compose exec websocket sh

# Debug networking
docker-compose exec websocket ping redis
```

### Common Issues

1. **Port conflicts**: Change host ports in docker-compose.yml
2. **Memory issues**: Increase Docker memory allocation
3. **Permission errors**: Check volume permissions
4. **Network issues**: Verify firewall rules

## Performance Tuning

### Resource Limits

```yaml
services:
  websocket:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Optimization Tips

1. Use Alpine-based images for smaller size
2. Multi-stage builds to reduce final image size
3. Cache npm dependencies in separate layer
4. Use health checks for automatic recovery
5. Configure appropriate logging drivers

## Next Steps

- [Kubernetes Deployment](./kubernetes)
- [CI/CD Integration](./ci-cd)
- [Monitoring Setup](./monitoring)
- [Scaling Guide](./scaling)