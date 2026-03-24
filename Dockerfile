# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Production stage
FROM node:18-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Copy PM2 ecosystem config
COPY ecosystem.config.js .

# Expose port
EXPOSE 3000

# Switch to non-root user
USER nodejs

# Start with PM2 in cluster mode
CMD ["npm", "run", "cluster"]
