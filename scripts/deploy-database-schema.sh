#!/bin/bash

# Complete Database Schema Deployment Script
# Run this on your production server to import the complete schema from development

set -e  # Exit on any error

echo "🚀 Deploying AddyPin Database Schema to Production"
echo "=================================================="

# Create temporary schema file with complete development schema
cat > /tmp/addypin_schema.sql << 'EOF'
--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.analytics (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    pin_id character varying,
    event_type text NOT NULL,
    user_agent text,
    ip_address text,
    country text,
    browser text,
    os text,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    metadata jsonb,
    session_id character varying
);


--
-- Name: daily_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.daily_stats (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    date text NOT NULL,
    pins_created integer DEFAULT 0 NOT NULL,
    links_clicked integer DEFAULT 0 NOT NULL,
    emails_sent integer DEFAULT 0 NOT NULL,
    unique_countries integer DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    daily_users integer DEFAULT 0 NOT NULL,
    registered_users integer DEFAULT 0 NOT NULL
);


--
-- Name: map_app_clicks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.map_app_clicks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    pin_id character varying NOT NULL,
    app_name text NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    user_agent text,
    ip_address text,
    country text,
    session_id character varying
);


--
-- Name: otp_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.otp_codes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    code character varying(6) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: pins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.pins (
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


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password text NOT NULL
);


--
-- Add constraints and indexes (only if they don't exist)
--

-- Primary keys
DO $$ BEGIN
    ALTER TABLE public.analytics ADD CONSTRAINT analytics_pkey PRIMARY KEY (id);
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.daily_stats ADD CONSTRAINT daily_stats_pkey PRIMARY KEY (id);
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.map_app_clicks ADD CONSTRAINT map_app_clicks_pkey PRIMARY KEY (id);
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.otp_codes ADD CONSTRAINT otp_codes_pkey PRIMARY KEY (id);
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.pins ADD CONSTRAINT pins_pkey PRIMARY KEY (id);
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Unique constraints
DO $$ BEGIN
    ALTER TABLE public.pins ADD CONSTRAINT pins_shortcode_unique UNIQUE (shortcode);
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.users ADD CONSTRAINT users_username_unique UNIQUE (username);
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Foreign keys
DO $$ BEGIN
    ALTER TABLE public.analytics ADD CONSTRAINT analytics_pin_id_pins_id_fk FOREIGN KEY (pin_id) REFERENCES public.pins(id);
    EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.map_app_clicks ADD CONSTRAINT map_app_clicks_pin_id_pins_id_fk FOREIGN KEY (pin_id) REFERENCES public.pins(id);
    EXCEPTION WHEN others THEN NULL;
END $$;

EOF

echo "📋 Schema file created at /tmp/addypin_schema.sql"

# Database connection details
DB_HOST="172.17.0.1"
DB_USER="addypin_user"  
DB_NAME="addypin"

echo "🔗 Connecting to production database..."
echo "Host: $DB_HOST"
echo "User: $DB_USER"
echo "Database: $DB_NAME"
echo ""

# Import schema
echo "📥 Importing database schema..."
if PGPASSWORD="secure_password_123" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f /tmp/addypin_schema.sql; then
    echo "✅ Schema imported successfully!"
else
    echo "❌ Schema import failed. Check password and connection."
    exit 1
fi

echo ""
echo "📊 Verifying tables were created..."
PGPASSWORD="secure_password_123" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt"

echo ""
echo "🧪 Testing application health check..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
    echo "✅ Health check PASSED! Application is now fully functional."
else
    echo "⚠️  Health check response:"
    echo "$HEALTH_RESPONSE"
fi

echo ""
echo "🧹 Cleaning up temporary files..."
rm -f /tmp/addypin_schema.sql

echo ""
echo "🎉 Database deployment complete!"
echo ""
echo "Next steps:"
echo "- Test pin creation on https://addypin.com"
echo "- Run monitoring: /opt/addypin/monitoring/system-monitor.sh"
echo "- Check logs: docker logs addypin"