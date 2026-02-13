# Product Requirements - AddyPin

## Overview

AddyPin transforms GPS coordinates into short, memorable links that work across all map applications. Users pin a location on an interactive map and receive a shareable shortcode accessible via web link or email.

## Core Requirements

### Pin Creation
- Users click on an interactive Leaflet map to select coordinates
- System generates a unique 6-character alphanumeric shortcode (uppercase)
- Pins without email expire after 72 hours
- Pins with email are permanent
- Rate limited: 5 pins/hour, 15 pins/day per IP

### Dual Format Sharing
- **Web link**: `ABC123.addypin.com` - redirects to pin page with map links
- **Email**: `ABC123@addypin.com` - auto-responds with map links for that location

### Pin Page
- Shows interactive map with pin location
- Lists links to 13 map applications (Google Maps, Apple Maps, Waze, etc.)
- Click tracking for analytics

### Email System
- Maddy mail server receives emails to `*@addypin.com`
- Webhook forwards to application API
- Application sends auto-response via Resend API with location details and map links

### Pin Editing
- Users with email can request OTP verification
- After OTP verification, receive edit token
- Can update pin coordinates

### Analytics
- Track pin creation, clicks, email sends, visits
- Dashboard shows cumulative stats, top map apps, active countries
- Daily aggregated stats

### Security
- Bot detection (user agent, timing, honeypot fields)
- Rate limiting (general: 100 req/15min, pin creation: 5/hour)
- DDoS protection middleware
- Config file blocking (.env, vendor/*)

## Supported Map Applications

1. Google Maps
2. Apple Maps
3. Waze
4. HERE WeGo
5. MapQuest
6. Maps.me
7. OpenStreetMap
8. Bing Maps
9. TomTom
10. Citymapper
11. OsmAnd
12. Sygic Maps
13. Badger Maps
