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

## v2 Postfix inbound config (for M10)

addypin v2 receives email on `*@addypin.com` via Postfix's pipe
transport. Three local-parts have handlers (`login`, `resend`, any
6-char shortcode); everything else silently drops.

### `/etc/postfix/master.cf`

Add the pipe transport:

```
addypin   unix  -       n       n       -       -       pipe
  flags=DRhu user=addypin argv=/opt/addypin/ops/inbound-wrapper.sh
```

The wrapper path MUST match where the repo actually places the file
(`ops/inbound-wrapper.sh`). If the script is moved or renamed, both
the repo tree and `/etc/postfix/master.cf` on the VPS must be updated
— mismatch = every inbound email gets deferred with
"pipe: fatal: pipe_command: execvp ...: No such file or directory".

### `/etc/postfix/main.cf`

Route all inbound addypin mail to the transport:

```
transport_maps = hash:/etc/postfix/transport
```

### `/etc/postfix/transport`

```
addypin.com  addypin:
.addypin.com addypin:
```

Then `postmap /etc/postfix/transport && postfix reload`.

### `/opt/addypin/ops/inbound-wrapper.sh`

```sh
#!/usr/bin/env bash
set -e
set -a; source /etc/addypin/env; set +a
exec /usr/bin/env node --experimental-sqlite \
  /opt/addypin/server/inbound-cli.js
```

`/etc/addypin/env` holds the three `ADDYPIN_*_KEY` hex values + `DATA_DIR` + `BASE_URL`. Permissions 640, owner `root:addypin`.

### Smoke tests (run on the VPS after deploy)

```sh
# confirmation auto-reply
echo -e 'From: me@me.com\nTo: HOUSE1@addypin.com\nSubject: s\n\n' | \
  sudo -u addypin /opt/addypin/ops/inbound-wrapper.sh
# expected stderr: {"t":"...","kind":"inbound","action":"sent","type":"shortcode_reply"}

# login magic link
echo -e 'From: owner@me.com\nTo: login@addypin.com\nSubject: s\n\n' | \
  sudo -u addypin /opt/addypin/ops/inbound-wrapper.sh
# expected: action:"sent" type:"login" (if owner@me.com has pins)
```
