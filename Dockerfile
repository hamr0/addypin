# Use official Node runtime as base image
FROM node:20-alpine

# Add runtime tools first
RUN apk add --no-cache curl

# Add build dependencies for native modules
RUN apk add --no-cache --virtual .build-deps \
    gcc \
    g++ \
    make \
    python3

# Set working directory in container
WORKDIR /app

# Create node user directory and set permissions
RUN mkdir -p /home/node/.npm && \
    chown -R node:node /home/node/.npm && \
    chown -R node:node /app

# Copy package files FIRST (allows Docker to cache dependencies)
COPY package*.json ./

# Fix npm cache permissions and install ALL dependencies (including devDependencies for build)
RUN npm cache clean --force && \
    npm config set cache /home/node/.npm && \
    npm ci

# Remove build dependencies to reduce image size
RUN apk del .build-deps

# Copy the rest of application code
COPY . .

# BUILD THE APP INSIDE THE CONTAINER with user permissions
RUN chown -R node:node /app && \
    npx vite build && \
    npx esbuild server/index.ts \
      --platform=node \
      --packages=external \
      --external:vite \
      --external:./vite \
      --bundle \
      --format=esm \
      --outdir=dist && \
    npm prune --production

# Tell Docker the port to expose
EXPOSE 3000

# Add Docker healthcheck with comprehensive monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/api/health || exit 1

# Switch to node user for security
USER node

# Define the command to run the app
CMD ["node", "dist/index.js"]