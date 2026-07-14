# nginx (production)

The VPS also serves **`ingest.late.fyi`** from `/etc/nginx/conf.d/latefyi-ingest.conf`,
which is deliberately **not** behind Cloudflare — it resolves straight to
`155.94.144.191`. Anything you do at the *firewall* level (e.g. restricting :443 to
Cloudflare's ranges) will therefore kill late.fyi's ingest endpoint. That is why the
origin lock below is enforced **per-vhost in nginx**, not with a firewall rule.
Check before you touch port 443 on this box.

## `00-cloudflare-realip.conf` (tracked here, installed to `/etc/nginx/conf.d/`)

Two things, both added 2026-07-14:

1. **`set_real_ip_from` + `real_ip_header CF-Connecting-IP`** — restores the true
   visitor IP. Cloudflare terminates TLS at its edge and re-originates, so without
   this nginx's peer is a CF edge address and *every* per-IP rate-limit bucket
   (addypin's and knowless's) is shared by everyone through the same CF colo. See
   [PRD §8](../../docs/01-product/prd.md).

2. **`geo $realip_remote_addr $addypin_cf_peer`** — answers "did this request
   actually come from Cloudflare?". It must key on `$realip_remote_addr` (the
   *original* TCP peer) because after (1) `$remote_addr` is the restored visitor
   and can no longer tell us how the request arrived.

Scoping `set_real_ip_from` to Cloudflare's published ranges is load-bearing, not
hygiene: without it, a client reaching the origin directly could forge
`CF-Connecting-IP` and mint any rate-limit bucket it liked.

## The origin lock lives in `addypin.conf` (NOT tracked)

`/etc/nginx/conf.d/addypin.conf` carries four guard lines — one in each addypin
server block (`:80` redirect, `www` redirect, apex, shortcode regex):

```nginx
# Reject direct-to-origin hits: addypin is only reachable via Cloudflare.
if ($addypin_cf_peer = 0) { return 403; }
```

Without these, anyone who learns the origin IP can `curl --resolve` straight past
Cloudflare, skipping its WAF and DDoS protection. `addypin.conf` itself is not
tracked in this repo; if you regenerate it, re-add these four lines or the origin
is exposed again.

## Verifying

Config inspection is not enough — the failure mode here *looks fine* in the config.
Check behaviour:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://addypin.com/                    # 200 (via CF)
curl -sk -o /dev/null -w '%{http_code}\n' --resolve addypin.com:443:155.94.144.191 \
     https://addypin.com/                                                        # 403 (direct)
curl -s -o /dev/null -w '%{http_code}\n' https://ingest.late.fyi/                # NOT 403
```

To confirm real IPs are being attributed, request a unique path and check that
`/var/log/nginx/addypin.access.log` shows *your* address, not a Cloudflare one.

Cloudflare changes its IP ranges rarely. If origin logs start showing CF addresses
again, refresh them from <https://www.cloudflare.com/ips-v4> / `ips-v6`.
