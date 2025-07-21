# Dockerfile for Semantest CLI
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache tini

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S semantest -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=semantest:nodejs /app/dist ./dist
COPY --from=builder --chown=semantest:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=semantest:nodejs /app/package*.json ./

# Set environment
ENV NODE_ENV=production

# Switch to non-root user
USER semantest

# Use tini for signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Default command - can be overridden
CMD ["node", "dist/index.js"]

# Labels
LABEL \
    org.opencontainers.image.title="Semantest CLI" \
    org.opencontainers.image.description="Command-line interface for Semantest distributed testing framework" \
    org.opencontainers.image.version="0.1.0" \
    org.opencontainers.image.vendor="Semantest Team"