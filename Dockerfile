# Use exact Node.js version from Replit
FROM node:20.19.3-bullseye-slim

# Install build tools (equivalent to NixOS build tools)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    python3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory to match Replit
WORKDIR /home/runner/workspace

# Create non-root user matching Replit
RUN groupadd -r runner && useradd -r -g runner runner
RUN chown -R runner:runner /home/runner/workspace

# Copy package files first for better caching
COPY --chown=runner:runner package*.json ./

# Switch to runner user
USER runner

# Install dependencies with exact versions
RUN npm ci --only=production

# Copy application code
COPY --chown=runner:runner . .

# Build the application (matches Replit build process)
RUN npm run build

# Set production environment
ENV NODE_ENV=production

# Expose the port
EXPOSE 5000

# Start the application (matches Replit startup)
CMD ["npm", "start"]