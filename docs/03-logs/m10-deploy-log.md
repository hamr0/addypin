# M10 VPS Cutover Log

Live deployment journal for the v1 → v2 nuke + rebuild. Document the
state of the box on disk so any future session can resume without
re-recon from scratch.

**Session:** 2026-04-19 (partial — paused mid-Phase 3c on TLS cert blocker)
**VPS:** `root@155.94.144.191` (AlmaLinux 8.10, 23 GB disk, 962 MB RAM)
**Branch deployed:** `origin/v2-rewrite` (rsync'd to `/opt/addypin`)

## Phases completed ✅

### Phase 1 — Backup (done)

Pulled to `~/addypin-v1-snapshot-2026-04-19/` on the local machine:
- `letsencrypt.tar.gz` (476 KB — both cert lineages + renewal configs)
- `nginx-active.tar.gz` (1 KB — nginx.conf + addypin.conf live)
- `crontab.txt` (9 lines, RESEND_API_KEY redacted)
- `maddy.tar.gz` (380 B — maddy config for reference)
- `systemd-units-list.txt` (12 entries)
- `ssh/root.authorized_keys` (17 lines)
- `opt-file-listing.txt` (100 lines of `find /opt`)

Postgres dump skipped (no creds; per PRD we don't migrate v1 data).

### Phase 2 — Nuke (done)

Removed / uninstalled:
- Docker containers (addypin-app-1, addypin-staging-app-1), images
  (ghcr.io/amrhas82/addypin:latest + staging), volumes (`addypin_pg_data`).
- docker-ce / containerd.io / docker-buildx-plugin / docker-compose-plugin (`dnf remove`).
- postgresql-server / postgresql packages + `/var/lib/pgsql`.
- maddy systemd unit + config.
- Custom systemd units: `addypin.service`, `addypin-monitor.service`,
  `addypin-monitor.timer`, `maddy.service`, `personal-data-os.service`.
- `/opt/` contents: `addypin`, `addypin-staging`, `addypin-foundation-backup`,
  `addypin-migration`, `backups`, `vault`, `containerd`, scripts.
- `/etc/nginx/conf.d/` — 7 backup variants purged; live addypin.conf archived
  to `/root/addypin.conf.v1-archive` then removed.
- Root crontab (wiped — had `RESEND_API_KEY` plaintext leak).
- `deploy` system user (kept `addypin`).
- `/root`: ~520 MB of prior-session clutter purged (/root/go, /root/kubectl,
  /root/.nvm, /root/.cache, /root/.npm, all the `ls`-like mistake files,
  `.docker`, `.kube`). Kept: `.ssh`, `.msmtprc`, `.bashrc`, `.gitconfig`,
  `.git-credentials`, `.config`, default shell skel, `.bash_history`.
- Immutable flag (`chattr +i`) cleared off `/opt/addypin/config-backup-immutable/`
  before rm (discovered mid-Phase 3b).

Preserved:
- `/etc/letsencrypt/` — both cert lineages (see §Cert blocker below).
- `/root/.ssh/authorized_keys` (17 lines of authorized keys — your local
  ed25519 is the active one).

Disk after Phase 2: **6.7 GB used (from 11 GB) → 4.3 GB freed**.

### Phase 3a — Rebuild foundation (done)

- Node 22.22.2 installed via NodeSource (replaces v20); `/usr/bin/node`.
- Postfix installed (but not yet configured — see §Remaining below).
- OpenDKIM 2.11.0 + opendkim-tools installed (not configured yet).
- Firewall: smtp / http / https / ssh all permitted.
- `addypin` system user kept (uid 1000).
- Created: `/etc/addypin/` (mode 750, root:addypin), `/opt/addypin/`, `/var/log/addypin/`.

Disk after Phase 3a: 6.2 GB used.

### Phase 3b — Code deploy (done)

- Code rsync'd from local working tree to `/opt/addypin/` (excluding
  `archive/`, `data/`, `node_modules`, `.claude`, `.barebrowse`).
- `.git/` included so future `git pull` works (after adding SSH key or PAT).
- Ownership: `addypin:addypin` throughout.
- Generated three fresh 32-byte hex keys via `openssl rand -hex 32`.
- Wrote `/etc/addypin/env` (mode 640, root:addypin) with:
  - `ADDYPIN_DATA_KEY`, `ADDYPIN_EMAIL_KEY`, `ADDYPIN_SIGNING_KEY`
  - `PORT=3000`
  - `DATA_DIR=/var/lib/addypin`
  - `BASE_URL=https://addypin.com`
  - `MAIL_FROM_ADDRESS=noreply@addypin.com`
  - `MAIL_FROM_NAME=addypin`
- VPS keys archived to pass under `addypin/prod/{data_key,email_key,signing_key}`
  for disaster recovery (losing ADDYPIN_DATA_KEY means the DB is a brick).
- `npm test` on VPS: **177/177 pass in 5.7s** ✅
- `/opt/addypin` size: 397 MB (mostly `.git/` with v1 blobs in history; a
  `git gc --aggressive` would shrink this significantly but not blocking).

### Phase 3c — Service + nginx (done, but nginx serves expired cert)

- `/etc/systemd/system/addypin.service` created and enabled. Hardened:
  `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`,
  `ReadWritePaths=/var/lib/addypin /var/log/addypin`.
- Service started, listening on `:3000`. Journal log confirms:
  > `mail: msmtp found, using it for outbound`
  > `addypin listening on :3000`
- Local `curl http://127.0.0.1:3000/api/health` → 200 ✅
- `/etc/nginx/conf.d/addypin.conf` written (HTTP→HTTPS, www→apex,
  proxy to upstream `addypin_backend 127.0.0.1:3000`, HSTS, 20-conn/IP
  limit, 64k request size cap). Config syntax OK. Nginx reloaded.
- External HTTPS fails because of the cert blocker below.

### Phase 3c — TLS cert renewal (done, 2026-04-19 session 2)

- `/etc/letsencrypt/renewal/addypin.com.conf`: switched
  `authenticator = standalone` → `authenticator = webroot` + `webroot_path = /var/www/certbot`.
  Original saved as `.bak`.
- `/var/www/certbot/` created (nginx already has the
  `location /.well-known/acme-challenge/` block pointing there).
- `certbot renew --cert-name addypin.com --force-renewal`: "all renewals succeeded".
  New expiry: 2026-07-18 (89 days). `addypin.com-0001` (wildcard, dns-01 manual)
  still expired — we don't need it for v2.0.
- `nginx -s reload` → `curl -I https://addypin.com/api/health` = **200 + HSTS** ✅.

### Phase 3d — Postfix + inbound pipe (done, 2026-04-19 session 2)

- Backups: `/etc/postfix/{main.cf,master.cf}.bak-2026-04-19`,
  `/etc/postfix/transport.orig-sample`.
- `postconf -e` on main.cf:
  - `mydestination = localhost` (was `localhost, addypin.com` — removed so
    pipe transport owns addypin.com)
  - `transport_maps = hash:/etc/postfix/transport`
  - `virtual_alias_maps =` (cleared; we don't use it)
- `/etc/postfix/master.cf`: appended `addypin unix -- pipe` service block
  running `/opt/addypin/inbound-wrapper.sh` as user `addypin`
  (flags=DRhu).
- `/etc/postfix/transport`:
  ```
  addypin.com  addypin:
  .addypin.com addypin:
  ```
  + `postmap` to build the `.db`.
- `/opt/addypin/inbound-wrapper.sh` (mode 750, addypin:addypin):
  `cd /opt/addypin` **before** sourcing env + exec node — without the
  `cd`, pipe runs with Postfix's cwd (/var/spool/postfix) and
  `inbound-cli.js` throws `EACCES` trying to read `.env` from cwd.
  Source of truth in repo: `ops/inbound-wrapper.sh`.
- `postfix check` → ok; `systemctl enable --now postfix` → active.
- Smoke tests (all 3 green, stderr JSON to journald):
  - `HOUSE1@` → `{"action":"drop","reason":"no_such_pin"}`
  - `login@` → `{"action":"drop","reason":"no_pins"}` (no pins for owner@me.com yet)
  - `garbage@` → `{"action":"drop","reason":"unknown_route"}`

### Phase 3e — OpenDKIM + DNS (done, 2026-04-19 session 2)

- `opendkim-genkey -b 2048 -d addypin.com -s addypin2026` in
  `/etc/opendkim/keys/addypin.com/`. Private key mode 600,
  `opendkim:opendkim`.
- `/etc/opendkim.conf` written with `Mode=sv`, `Socket=local:/run/opendkim/opendkim.sock`,
  `OversignHeaders=From`, `Canonicalization=relaxed/simple`. Backed up
  prior file to `.bak-2026-04-19`.
- `KeyTable`, `SigningTable`, `TrustedHosts` under `/etc/opendkim/`.
  Trusted hosts: `127.0.0.1`, `::1`, `localhost`, `addypin.com`,
  `mail.addypin.com`.
- Postfix milter wired via `postconf -e`:
  `smtpd_milters = unix:/run/opendkim/opendkim.sock`,
  `non_smtpd_milters = $smtpd_milters`,
  `milter_default_action = accept`, `milter_protocol = 6`.
- Added `postfix` user to `opendkim` group for socket access, then
  `systemctl restart postfix`.
- DNS (Route 53 via CloudShell `aws route53 change-resource-record-sets`,
  UPSERT with `file://` heredoc — much cleaner than pasting JSON inline):
  - **Added** `addypin2026._domainkey.addypin.com` TXT with the DKIM
    public key, split into three ≤255-char quoted strings. Resolvers
    concatenate at lookup time. One TXT RRSET, confirmed via dig on
    both 8.8.8.8 and 1.1.1.1.
  - **Updated** `addypin.com` TXT (SPF) — dropped `include:_spf.resend.com`.
    Now `"v=spf1 a:mail.addypin.com ~all"`. `~all` stays until a
    mail-tester pass confirms DKIM alignment, then Phase 3h tightens
    to `-all`.
  - **Deleted** `resend._domainkey.addypin.com` TXT (dead Resend key).
  - `_dmarc` TXT left unchanged (`p=none; rua=mailto:admin@addypin.com`).
    Admin reports silently drop at the pipe until we add an `admin`
    handler or repoint rua.
- Loopback verification: `echo ... | sendmail -f noreply@addypin.com root@localhost`
  triggered journal line:
  `opendkim: D074F61F56: DKIM-Signature field added (s=addypin2026, d=addypin.com)`
  Postfix then routed via pipe transport to the Node inbound CLI
  (side-effect: `localhost.addypin.com` matches `.addypin.com` in
  transport; inbound dropped as `unknown_route`, which is correct).
- **msmtp reconfigured.** The old `/root/.msmtprc` from v1 relayed
  through Gmail SMTP with static auth — it would have bypassed our
  local OpenDKIM signing entirely. Deleted it and its log, then wrote
  a minimal `/home/addypin/.msmtprc` (mode 600) that submits to
  `127.0.0.1:25` with `auth off, tls off`. New path:
  `app → msmtp → localhost Postfix → OpenDKIM sign → public MX`.
- **mail-tester.com external verification:** sent via the new
  msmtp→Postfix path, scored **10/10** (DKIM pass, SPF pass, DMARC
  pass, zero blacklists). Outbound deliverability validated.

### Phase 3f — Off-VPS backup + uptime watchdogs (done, 2026-04-19 session 3)

Three monitoring layers now live, each catching what the others miss:

1. **Site uptime** — Kuma HTTP monitor on the fedora home server
   (federver) polling `https://addypin.com/api/health` every 60 s.
   Survives total VPS loss.
2. **Backup heartbeat** — Kuma Push monitor with 24 h interval + 1 h
   grace. The daily backup job pings it on success; a silent failure
   trips the grace window and alerts.
3. **On-VPS health** — `ops/health-check.sh` via 15-min systemd timer
   (see "Phase 3f (partial)" below, still running).

Backup runner: `ops/homeserver/addypin-backup.{sh,service,timer}`
deployed on federver.
- Daily at 03:15 local, `Persistent=true` so a powered-off home
  server catches up on next boot.
- Pulls `addypin.db` + WAL sidecars via `ssh … | tar -cf - … | tar -xf -`
  into `~/addypin-backups/daily/YYYY-MM-DD/` (rsync 3.4 on fedora
  refused the source-side glob through the restricted shell we allow;
  ssh+tar is equivalent and version-agnostic).
- Tars `/etc/letsencrypt/` remotely to preserve symlinks.
- Rotates out dirs older than 30 days.
- First run 2026-04-19 23:47 local: 656 KB total, 10 s wall.
- Federver install log committed alongside the script at
  `ops/homeserver/FEDERVER_INSTALL.md` so future sessions see actual
  deployed state.

Remaining M10 items: Phase 3h only (SPF `~all` → `-all`, deferred
~24 h to watch DKIM stay stable).

### Phase 3f (partial) — Ops monitor (done, 2026-04-19 session 2)

Ported the gitdone health-check pattern (15-min oneshot+timer, email-on-fail).
Repo layout: `ops/health-check.sh`, `ops/systemd/addypin-health.{service,timer}`.

Checks:
1. systemd units: `addypin.service`, `postfix.service`, `nginx.service`
   (failed **or** inactive)
2. local API: `http://127.0.0.1:3000/api/health` (5s timeout)
3. disk: `/` and `/var/lib/addypin` vs 85% threshold
4. postfix mailq deferred count vs 50
5. `journalctl -u addypin.service` errors in last hour
6. TLS expiry on `addypin.com` (warn < 14 days)
7. DB file sanity (exists, ≥ 1 KB)

Alert email goes to `avoidaccess@gmail.com` (override via
`ADDYPIN_ALERT_TO` in `/etc/default/addypin-health`), sent through local
`/usr/sbin/sendmail` (Postfix delivers). First run 2026-04-19 — silent
(green). Still pending in Phase 3f: nightly DB backup rsync and off-VPS
uptime watchdog.

## Phase 3c — Blocked on cert renewal (superseded — resolved above)

Both Let's Encrypt certificates on the box are EXPIRED:

| Lineage | Domains | Authenticator | Expiry | Note |
|---|---|---|---|---|
| `addypin.com` | apex + staging + www | **standalone** (port 80) | 2026-03-18 | 1 month past |
| `addypin.com-0001` | apex + wildcard `*.addypin.com` | **manual dns-01** | 2025-12-02 | 5 months past |

v2 only needs the apex for v2.0 (subdomain-per-shortcode is v2.1). So the
`addypin.com` (standalone) lineage is the target. **Standalone auth needs port
80 free**, which nginx occupies. Two fixes, pick one in next session:

1. **Webroot** — change `renewal/addypin.com.conf` from `authenticator = standalone`
   to `authenticator = webroot` + `webroot_path = /var/www/certbot`. Nginx
   already has `location /.well-known/acme-challenge/ { root /var/www/certbot; }`
   in our new config. Zero-downtime.
2. **Standalone with brief nginx stop** — `systemctl stop nginx && certbot renew --force-renewal && systemctl start nginx`. ~10 s of HTTP downtime.

Recommended: option 1 (webroot). Paste both renewal configs + retry:

```sh
# On VPS:
sed -i 's/^authenticator = standalone/authenticator = webroot\nwebroot_path = \/var\/www\/certbot/' \
  /etc/letsencrypt/renewal/addypin.com.conf
certbot renew --cert-name addypin.com --force-renewal
systemctl reload nginx
# Test:
curl -I https://addypin.com/api/health    # should be 200 without --insecure
```

## Remaining work to ship v2

**Phase 3d — Postfix + inbound pipe** (pending):
- Configure `/etc/postfix/main.cf`: `myhostname=mail.addypin.com`, `mydomain=addypin.com`, `transport_maps=hash:/etc/postfix/transport`, `mydestination=localhost`, milters for opendkim.
- `/etc/postfix/master.cf`: add the `addypin` pipe transport (config in `docs/00-context/infra-snapshot.md`).
- `/etc/postfix/transport`: `addypin.com addypin:`; `postmap` it.
- `/opt/addypin/inbound-wrapper.sh`: shebang + env sourcing + exec node on `server/inbound-cli.js`. Owner addypin, mode 750.
- Smoke tests (in `infra-snapshot.md`): pipe a test message into the wrapper, verify journal log line.

**Phase 3e — OpenDKIM keys + DNS** (pending):
- Generate selector `addypin2026` in `/etc/opendkim/keys/addypin.com/`.
- `/etc/opendkim.conf` + socket + postfix milter wiring.
- DNS: publish TXT record at `addypin2026._domainkey.addypin.com` (contents from `selector.txt`).
- Verify signing on a test outbound via mail-tester.com or similar.

**Phase 3f — Crons** (pending):
- Nightly backup: rsync `/var/lib/addypin/addypin.db` + `/etc/letsencrypt/` to off-VPS host.
- 30-min disk-space watch: `df /` + `df /var/lib/addypin` → msmtp if <15% free.
- 5-min on-VPS health: `curl -fsS http://127.0.0.1:3000/api/health || msmtp self`.
- External uptime watchdog: set up on a separate host (Healthchecks.io free tier or a second VPS).

**Phase 3g — End-to-end smoke** (pending):
- Create pin via https://addypin.com → confirmation email arrives via real msmtp.
- Click `/confirm?token=...` → 302 → `/:SHORTCODE` renders with 12 map-app buttons.
- Email `SHORTCODE@addypin.com` → receive auto-reply with coords + "Near: ..." line + links. (This tests the full inbound loop.)
- Email `login@addypin.com` → magic link replies → `/manage` works.

**Phase 3h — DNS housekeeping** (pending):
- Tighten SPF: drop `include:_spf.resend.com` now that Resend is gone. Keep `~all` or move to `-all` once DKIM is confirmed working.
- Verify PTR record still matches (per user's earlier note, it's set).

## Resumption checklist (for fresh context)

1. SSH key: reconstruct from `pass show addypin/ssh/private_key`, wrap in PEM, write to `/dev/shm/addypin-ssh/id` (mode 600). See earlier session for exact wrap command.
2. VPS state: addypin.service running on 3000, nginx on 80/443 (expired cert), no docker/postgres/maddy.
3. Start here: **cert renewal via webroot** (Phase 3c blocker).
4. Then: Phase 3d/e/f/g in order.
5. `git pull` inside `/opt/addypin` requires GitHub auth — add a read-only deploy key or put a real PAT in `pass addypin/github/github_token` (currently a placeholder string).

## Gotchas encountered (for future-me)

- Pass entries `addypin/server/vps_{host,ip,user}`, `addypin/github/git_url`, and `addypin/github/github_token` are **schema placeholders** (literal strings like `"vps_host"`, `"GITHUB_TOKEN"`), not real values. Real creds live under `addypin/ssh/`.
- `pass show` entries here follow the multi-line `first-line: label\nusername: <base64>` format. The private SSH key is on line 2 after stripping `username: `, and needs PEM BEGIN/END wrapping + 70-char line folds before SSH will accept it.
- Immutable (`chattr +i`) files in `/opt/addypin/config-backup-immutable/` from v1 — `rm -rf` fails until `chattr -R -i` clears them.
- `certbot renew` with `standalone` authenticator hangs when nginx occupies port 80.
- git inside `/opt/addypin` complains "dubious ownership" when run as root against addypin-owned files. `sudo -u addypin git ...` fixes it.
