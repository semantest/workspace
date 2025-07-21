# Multi-stage Docker build for Semantest WebSocket Server
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy package files
COPY package*.json tsconfig*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install production system dependencies and create non-root user
RUN apk add --no-cache \
    curl \
    tini \
    && addgroup -g 1001 -S nodejs \
    && adduser -S semantest -u 1001

# Set working directory
WORKDIR /app

# Copy built application and dependencies
COPY --from=builder --chown=semantest:nodejs /app/dist ./dist
COPY --from=builder --chown=semantest:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=semantest:nodejs /app/package*.json ./

# Create necessary directories
RUN mkdir -p /app/logs /app/data && \
    chown -R semantest:nodejs /app/logs /app/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV NODE_OPTIONS="--max-old-space-size=2048 --enable-source-maps"

# Security settings
USER semantest
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "dist/index.js"]

# Labels for metadata
LABEL \
    org.opencontainers.image.title="Semantest WebSocket Server" \
    org.opencontainers.image.description="WebSocket server for Semantest distributed testing framework" \
    org.opencontainers.image.version="0.1.0" \
    org.opencontainers.image.vendor="Semantest Team" \
    org.opencontainers.image.source="https://github.com/semantest/workspace"