# Multi-stage build for Node.js backend
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Set working directory
WORKDIR /app

# Copy package files (copied by workflow)
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --legacy-peer-deps --no-audit

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install only runtime dependencies
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S backend -u 1001

# Set working directory
WORKDIR /app

# Copy package files (copied by workflow)
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --legacy-peer-deps --no-audit && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy shared directory
COPY --from=builder /app/shared ./shared

# Change ownership to non-root user
RUN chown -R backend:nodejs /app
USER backend

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]