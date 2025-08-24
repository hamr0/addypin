#!/bin/bash

# Complete AddyPin Database and Environment Setup Script
# This script handles both database schema deployment and environment variable configuration

set -e

echo "🚀 AddyPin Complete Database & Environment Deployment"
echo "====================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database configuration
DB_HOST="172.17.0.1"
DB_USER="addypin_user"
DB_NAME="addypin"
DB_PASSWORD="secure_password_123"

echo -e "${YELLOW}📊 Step 1: Deploying Database Schema${NC}"

# Create complete database schema
PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME << 'SQL'

-- AddyPin Complete Database Schema
-- Generated from shared/schema.ts

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password text NOT NULL
);

-- Create pins table (main table)
CREATE TABLE IF NOT EXISTS pins (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    shortcode character varying(6) NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    user_email text,
    is_active boolean DEFAULT true NOT NULL,
    user_id character varying,
    created_by character varying,
    expires_at timestamp without time zone
);

-- Create analytics table
CREATE TABLE IF NOT EXISTS analytics (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    pin_id character varying,
    event_type text NOT NULL,
    user_agent text,
    ip_address text,
    country text,
    browser text,
    os text,
    timestamp timestamp without time zone DEFAULT now() NOT NULL,
    metadata jsonb,
    session_id character varying
);

-- Create daily_stats table  
CREATE TABLE IF NOT EXISTS daily_stats (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    date text NOT NULL,
    pins_created integer DEFAULT 0 NOT NULL,
    links_clicked integer DEFAULT 0 NOT NULL,
    emails_sent integer DEFAULT 0 NOT NULL,
    unique_countries integer DEFAULT 0 NOT NULL,
    daily_users integer DEFAULT 0 NOT NULL,
    registered_users integer DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

-- Create otp_codes table
CREATE TABLE IF NOT EXISTS otp_codes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    code character varying(6) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

-- Add primary keys and constraints safely
DO $$ 
BEGIN
    -- Users table constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_pkey') THEN
        ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_unique') THEN
        ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
    END IF;
    
    -- Pins table constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pins_pkey') THEN
        ALTER TABLE pins ADD CONSTRAINT pins_pkey PRIMARY KEY (id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pins_shortcode_unique') THEN
        ALTER TABLE pins ADD CONSTRAINT pins_shortcode_unique UNIQUE (shortcode);
    END IF;
    
    -- Analytics table constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analytics_pkey') THEN
        ALTER TABLE analytics ADD CONSTRAINT analytics_pkey PRIMARY KEY (id);
    END IF;
    
    -- Daily stats table constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_stats_pkey') THEN
        ALTER TABLE daily_stats ADD CONSTRAINT daily_stats_pkey PRIMARY KEY (id);
    END IF;
    
    -- OTP codes table constraints  
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'otp_codes_pkey') THEN
        ALTER TABLE otp_codes ADD CONSTRAINT otp_codes_pkey PRIMARY KEY (id);
    END IF;
END $$;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_pins_shortcode ON pins(shortcode);
CREATE INDEX IF NOT EXISTS idx_pins_created_at ON pins(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_pin_id ON analytics(pin_id);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_otp_codes_email_code ON otp_codes(email, code);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);

SQL

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database schema deployed successfully${NC}"
else
    echo -e "${RED}❌ Database schema deployment failed${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Step 2: Verifying Database Tables${NC}"
PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt"

echo -e "${YELLOW}🔄 Step 3: Updating Container with Environment Variables${NC}"

# Stop existing container
echo "Stopping existing container..."
docker stop addypin 2>/dev/null || echo "Container not running"
docker rm addypin 2>/dev/null || echo "Container already removed"

# Check if .env file exists for API keys
ENV_FILE="/opt/addypin/.env"
if [ -f "$ENV_FILE" ]; then
    echo "Found .env file - using production API keys"
    
    # Extract API keys from .env file
    RESEND_KEY=$(grep "RESEND_API_KEY" $ENV_FILE | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    UMAMI_SECRET=$(grep "UMAMI_APP_SECRET" $ENV_FILE | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    UMAMI_SALT=$(grep "UMAMI_HASH_SALT" $ENV_FILE | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    GOOGLE_KEY=$(grep "GOOGLE_MAPS_API_KEY" $ENV_FILE | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    
    # Start container with production API keys
    docker run -d \
      --name addypin \
      --restart unless-stopped \
      -p 3000:3000 \
      -e DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME" \
      -e RESEND_API_KEY="$RESEND_KEY" \
      -e UMAMI_APP_SECRET="$UMAMI_SECRET" \
      -e UMAMI_HASH_SALT="$UMAMI_SALT" \
      -e GOOGLE_MAPS_API_KEY="$GOOGLE_KEY" \
      -e NODE_ENV="production" \
      addypin:latest
else
    echo "No .env file found - using development keys for testing"
    
    # Start container with minimal environment for testing
    docker run -d \
      --name addypin \
      --restart unless-stopped \
      -p 3000:3000 \
      -e DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME" \
      -e RESEND_API_KEY="re_test_key_development" \
      -e NODE_ENV="production" \
      addypin:latest
fi

echo -e "${YELLOW}⏳ Step 4: Waiting for Container Startup${NC}"
sleep 10

echo -e "${YELLOW}📊 Step 5: Checking Container Status${NC}"
docker ps | grep addypin

echo -e "${YELLOW}🧪 Step 6: Testing Health Check${NC}"
for i in {1..5}; do
    echo "Attempt $i/5..."
    if curl -f http://localhost:3000/api/health 2>/dev/null; then
        echo -e "${GREEN}✅ Health check PASSED!${NC}"
        echo ""
        echo -e "${GREEN}🎉 SUCCESS! AddyPin is now fully operational!${NC}"
        echo -e "${GREEN}✅ Database: All tables created${NC}"
        echo -e "${GREEN}✅ Container: Running with proper environment${NC}"
        echo -e "${GREEN}✅ Health: API responding correctly${NC}"
        
        echo ""
        echo "🌐 Test your website at: https://addypin.com"
        echo "📊 Local health check: http://localhost:3000/api/health"
        
        exit 0
    else
        echo "Health check failed, waiting 5 seconds..."
        sleep 5
    fi
done

echo -e "${RED}❌ Health check failed after 5 attempts${NC}"
echo "📋 Container logs:"
docker logs addypin --tail=20

echo ""
echo "🔍 Troubleshooting info:"
echo "Database connection: postgresql://$DB_USER:***@$DB_HOST:5432/$DB_NAME" 
echo "Container status: $(docker ps -f name=addypin --format 'table {{.Status}}')"

exit 1