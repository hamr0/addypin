# Infrastructure Snapshot (as of 2026-04-18)

Captured at the start of the v2 rewrite. This is what the production VPS and its DNS look like today. Anything not listed here is out of scope or does not exist.

## DNS (addypin.com)

| Record | Value | Notes |
|--------|-------|-------|
| A | `155.94.144.191` | VPS (RackNerd) |
| MX | `10 mail.addypin.com` | Self-hosted mail, points back at the VPS |
| TXT (SPF) | `v=spf1 a:mail.addypin.com include:_spf.resend.com ~all` | **v2 cleanup:** drop the `include:_spf.resend.com` once v2 ships, tighten `~all` → `-all` |
| NS | AWS Route 53 | Nameservers |

## Mail on the VPS

- **Postfix** is already running as the MX for addypin.com.
- Inbound path v1 uses: Resend inbound webhook (paid). v2 replaces this with **Postfix `virtual_alias_maps` + pipe transport** into a Node script. Zero SaaS.
- Outbound path v1 uses: Resend API. v2 replaces this with **msmtp** through Postfix's local submission port. Reuses the existing DKIM signing.

## TLS

- Let's Encrypt wildcard cert for `*.addypin.com`, renewed via nginx-integrated certbot.
- Covers the subdomain-per-shortcode lookup pattern (`HOUSE1.addypin.com`).

## Reverse proxy

- Nginx in front of the app process.
- Terminates TLS, passes HTTP to `127.0.0.1:<port>` where the Node server listens.

## What v2 carries over, what it drops

| Kept | Dropped |
|------|---------|
| VPS + Postfix + nginx | Docker, Docker Compose |
| Wildcard TLS cert | Umami analytics |
| DKIM signing | Resend (paid, SaaS) |
| msmtp (added) | PostgreSQL |
| systemd | GitHub Actions CI/CD pipeline (manual deploy for v2) |

## To verify before cutover

- DKIM selector on `mail.addypin.com` still signs outbound messages from msmtp (not just Resend).
- Postfix `virtual_alias_maps` can be edited without breaking the current v1 inbound (v1 continues to serve on old code until v2 is ready).
- Port plan: v1 currently listens on port 3000 (production) and 8080 (staging). v2 will pick a fresh port to allow parallel running during rollout.
