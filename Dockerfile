# Use official Node runtime as base image
FROM node:20-alpine

# Set working directory in container
WORKDIR /app

# Copy package files FIRST (allows Docker to cache dependencies)
COPY package*.json ./

# Install ALL dependencies (including dev deps needed for build)
RUN npm ci

# Copy the rest of application code
COPY . .

# BUILD THE APP INSIDE THE CONTAINER
# This environment is controlled and identical every time
RUN npx vite build && \
    npx esbuild server/index.ts \
      --platform=node \
      --packages=external \
      --bundle \
      --format=esm \
      --outdir=dist

# Tell Docker the port to expose
EXPOSE 3000

# Add Docker healthcheck with comprehensive monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Define the command to run the app
CMD ["node", "dist/index.js"]