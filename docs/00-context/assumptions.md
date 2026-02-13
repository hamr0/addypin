# Assumptions, Constraints & Risks

## Constraints

- **Budget**: ~$2.83/month total infrastructure cost
- **Single VPS**: All services run on one RackNerd VPS
- **Free tiers**: Resend (email), GitHub Actions (CI/CD), GHCR (registry) all on free tiers
- **No horizontal scaling**: Single-server architecture currently
- **Port 25**: Some ISPs block SMTP port 25, affecting email delivery

## Assumptions

- Traffic will remain low enough for a single VPS
- Free tier limits (Resend, GitHub Actions) are sufficient
- PostgreSQL on same VPS is adequate for current scale
- In-memory rate limiting is sufficient (no Redis needed)
- Users primarily share locations via web links, email format is secondary

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| VPS goes down | Full outage | Health monitoring with 5-min checks, auto-restart for Nginx |
| Free tier exceeded (Resend) | Email stops working | Monitor usage, upgrade if needed |
| Database corruption | Data loss | Persistent Docker volumes, backup strategy needed |
| DDoS attack | Site unavailable | Rate limiting, bot detection, Nginx protection |
| SSL cert expiry | Site shows warnings | Let's Encrypt auto-renewal |

## Unknowns

- Actual production traffic patterns and growth rate
- Whether email format (shortcode@addypin.com) sees significant adoption
- Long-term VPS reliability at $2/month tier
