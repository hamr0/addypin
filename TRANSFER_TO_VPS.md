# Complete Transfer and Deployment Commands

## Step 1: Download Files from Replit to Your Local Machine

**YOU execute these commands on your LOCAL machine:**

```bash
# Download the containerized files from Replit
# Option A: Use Replit's export feature
# Go to your Replit -> Files -> Download as ZIP

# Option B: Use git if you have it set up
git clone https://github.com/yourusername/addypin.git
cd addypin

# Create the deployment package manually
tar -czf addypin-containerized.tar.gz \
  frontend/ backend/ nginx/ scripts/ \
  docker-compose.yml

# Transfer to VPS
scp addypin-containerized.tar.gz root@addypin.com:/opt/addypin/
```

## Step 2: Alternative Direct Method (Faster)

**YOU execute this on your VPS to download directly:**

```bash
# Navigate to deployment directory
cd /opt/addypin

# Download the files directly using curl (if available in a repository)
# Or create them manually - I'll provide the commands

# Create frontend directory and files
mkdir -p frontend/src

# Create frontend package.json
cat > frontend/package.json << 'EOF'
{
  "name": "addypin-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "wouter": "^3.3.7"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^5.4.19"
  }
}
EOF

# Create frontend Dockerfile
cat > frontend/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Create frontend nginx config
cat > frontend/nginx.conf << 'EOF'
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Copy existing client files to frontend
cp -r addypin-repo/client/* frontend/ 2>/dev/null || true
```

## Step 3: Create Backend Structure

**YOU continue with these commands:**

```bash
# Create backend directory
mkdir -p backend/src

# Create backend package.json
cat > backend/package.json << 'EOF'
{
  "name": "addypin-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "esbuild src/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.21.2",
    "pg": "^8.13.1"
  },
  "devDependencies": {
    "esbuild": "^0.24.2",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
EOF

# Create backend Dockerfile
cat > backend/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
RUN addgroup -g 1001 -S nodejs && adduser -S backend -u 1001
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
RUN chown -R backend:nodejs /app
USER backend
EXPOSE 3000
CMD ["node", "dist/index.js"]
EOF

# Copy existing server files to backend
cp -r addypin-repo/server/* backend/src/ 2>/dev/null || true
cp -r addypin-repo/shared backend/ 2>/dev/null || true
```

## Step 4: Create Docker Compose

**YOU execute this:**

```bash
# Create main docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  frontend:
    build: 
      context: ./frontend
      target: production
    container_name: addypin-frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      target: production
    container_name: addypin-backend
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    container_name: addypin-postgres
    environment:
      - POSTGRES_DB=addypin_db
      - POSTGRES_USER=addypin
      - POSTGRES_PASSWORD=addypin_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
EOF

# Load environment variables
source .env

# Test the setup
docker-compose build frontend
docker-compose build backend
```

**Execute Step 2 first and let me know if you get any errors. We'll proceed step by step.**