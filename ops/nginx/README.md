# nginx (production)

**Port 443 on this box is firewall-locked to Cloudflare's ranges** — see
[`../firewall/`](../firewall/). Both vhosts served here, addypin and
**`ingest.late.fyi`** (`/etc/nginx/conf.d/latefyi-ingest.conf`), now sit behind
Cloudflare, so nothing legitimate reaches `:443` except from a CF edge.

This *inverted* an earlier constraint. `ingest.late.fyi` used to be grey-cloud
(direct to `155.94.144.191`), which is why the origin lock below was built
**per-vhost in nginx** rather than at the firewall — a `:443` firewall rule would have
killed it. Since **2026-07-15** ingest is orange too and the firewall drop is in
place, so ingest must now **stay** orange or the `:443` lock cuts it off. The nginx
403 below remains as the **L7 layer over the L3/L4 firewall drop**; check both if you
touch origin reachability on this box.

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

The trust list and `geo` block both carry all **22** of Cloudflare's published ranges
(15 IPv4 + 7 IPv6). Two were missing in the initial 2026-07-14 transcription
(`131.0.72.0/22`, `2c0f:f248::/32`) and restored 2026-07-15 — a missing range
false-403s every visitor routed through that colo, and the original one-colo
verification could not catch it. Keep the `set_real_ip_from` block, the `geo` block,
and the firewall allow-list in [`../firewall/`](../firewall/) in sync.

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
