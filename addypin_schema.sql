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

CREATE TABLE public.analytics (
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

CREATE TABLE public.daily_stats (
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

CREATE TABLE public.map_app_clicks (
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

CREATE TABLE public.otp_codes (
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

CREATE TABLE public.pins (
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

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password text NOT NULL
);


--
-- Name: analytics analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics
    ADD CONSTRAINT analytics_pkey PRIMARY KEY (id);


--
-- Name: daily_stats daily_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_stats
    ADD CONSTRAINT daily_stats_pkey PRIMARY KEY (id);


--
-- Name: map_app_clicks map_app_clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_app_clicks
    ADD CONSTRAINT map_app_clicks_pkey PRIMARY KEY (id);


--
-- Name: otp_codes otp_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_codes
    ADD CONSTRAINT otp_codes_pkey PRIMARY KEY (id);


--
-- Name: pins pins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pins
    ADD CONSTRAINT pins_pkey PRIMARY KEY (id);


--
-- Name: pins pins_shortcode_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pins
    ADD CONSTRAINT pins_shortcode_unique UNIQUE (shortcode);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: analytics analytics_pin_id_pins_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics
    ADD CONSTRAINT analytics_pin_id_pins_id_fk FOREIGN KEY (pin_id) REFERENCES public.pins(id);


--
-- Name: map_app_clicks map_app_clicks_pin_id_pins_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_app_clicks
    ADD CONSTRAINT map_app_clicks_pin_id_pins_id_fk FOREIGN KEY (pin_id) REFERENCES public.pins(id);


--
-- PostgreSQL database dump complete
--

