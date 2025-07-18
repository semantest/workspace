# Multi-stage Docker build for Semantest Enterprise
FROM node:18-alpine AS base

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    tini \
    curl \
    && rm -rf /var/cache/apk/*

# Create app user for security
RUN addgroup -g 1001 -S semantest && \
    adduser -S -D -H -u 1001 -s /sbin/nologin -G semantest semantest

# Set working directory
WORKDIR /app

# Install global dependencies
RUN npm install -g pnpm@8

# Copy package files
COPY package*.json pnpm-lock.yaml ./
COPY nodejs.server/package*.json ./nodejs.server/
COPY core/package*.json ./core/
COPY extension.chrome/package*.json ./extension.chrome/
COPY browser/package*.json ./browser/
COPY typescript.client/package*.json ./typescript.client/

# Install dependencies
RUN pnpm install --frozen-lockfile --production=false

# Copy source code
COPY . .

# Build applications
RUN pnpm run build

# Production stage
FROM node:18-alpine AS production

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    tini \
    curl \
    && rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S semantest && \
    adduser -S -D -H -u 1001 -s /sbin/nologin -G semantest semantest

# Set working directory
WORKDIR /app

# Copy built application from build stage
COPY --from=base --chown=semantest:semantest /app/dist ./dist
COPY --from=base --chown=semantest:semantest /app/node_modules ./node_modules
COPY --from=base --chown=semantest:semantest /app/package*.json ./
COPY --from=base --chown=semantest:semantest /app/nodejs.server/dist ./nodejs.server/dist
COPY --from=base --chown=semantest:semantest /app/nodejs.server/package*.json ./nodejs.server/
COPY --from=base --chown=semantest:semantest /app/core/dist ./core/dist
COPY --from=base --chown=semantest:semantest /app/core/package*.json ./core/

# Copy configuration files
COPY --chown=semantest:semantest docker/ ./docker/
COPY --chown=semantest:semantest scripts/ ./scripts/

# Set proper permissions
RUN chown -R semantest:semantest /app && \
    chmod -R 755 /app

# Switch to non-root user
USER semantest

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "nodejs.server/dist/index.js"]