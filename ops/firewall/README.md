# firewall (production origin lock, L3/L4)

`:443` on the VPS (`155.94.144.191`) is locked at the **firewalld** level to
Cloudflare's published ranges. Non-CF packets to `:443` are **dropped before nginx
sees them**. This is the network-level layer of the origin lock; the nginx `geo` 403
(see [`../nginx/README.md`](../nginx/README.md)) is the L7 layer on top.

## Why both layers

The nginx 403 only fires *after* the TCP + TLS handshake completes — so a volumetric
flood aimed straight at the raw IP still cost the origin CPU/bandwidth and bypassed
Cloudflare's DDoS protection. **The 403 protects content, not load.** The firewall
drop discards those packets at L3/L4, so they cost essentially nothing. Combined with
the origin IP no longer being in public DNS (both vhosts are orange-clouded), this is
the origin's first real network-level DDoS protection.

## ⚠️ The load-bearing precondition (it inverted on 2026-07-15)

**Every vhost on `:443` on this box must stay behind Cloudflare.** Until 2026-07-15,
`ingest.late.fyi` was grey-cloud (direct to the origin), so this firewall rule was
*impossible* — it would have cut ingest off, and the origin lock had to live per-vhost
in nginx instead. Now that ingest is orange too, the firewall lock is in place and the
rule has flipped:

> If `ingest.late.fyi` (or any vhost here) ever returns to grey-cloud, run
> `./cf-lock-443.sh --unlock` **first**, or that vhost is cut off.

Always check what else listens on `:443` before touching this
(`ss -tlnp | grep :443`). This is a per-host firewall rule, **not** scoped to a single
vhost — it cannot distinguish addypin from ingest.

## What's configured

firewalld `public` zone (single zone, `eth0`):

- the blanket `https` service is **removed** (it opened `:443` to all sources);
- rich-rule `accept` for each of Cloudflare's **15 IPv4 + 7 IPv6** ranges (priority
  `-1`), plus the origin's own IP `155.94.144.191` (so on-box health checks that
  resolve `addypin.com` → CF → origin, and any self-connect, still work);
- rich-rule `drop` for everything else on `:443` (priority `1`, so it loses to the
  accepts). Silent drop, not reject — a flood gets no response packet.

`:22` (SSH), `:25` (mail), `:80` are **untouched**. The CF range list here is the same
one in [`../nginx/00-cloudflare-realip.conf`](../nginx/00-cloudflare-realip.conf)
(`real_ip` + `geo` guard) — **keep all three in sync** when CF changes its ranges.

## `cf-lock-443.sh`

Idempotent (re)apply / update / unlock tool. Run **on the box, as root**:

```bash
sudo ./cf-lock-443.sh --dry-run   # print the rules, change nothing
sudo ./cf-lock-443.sh --apply     # runtime-first, 10-min deadman, smoke-test, persist-or-rollback
sudo ./cf-lock-443.sh --unlock    # restore blanket https, drop the lock (do this before greying a vhost)
```

`--apply` adds CF accepts *before* removing `https` (so `:443` is never closed to CF
mid-change), arms a 10-minute deadman that reverts to the persisted config unless the
run commits, then smoke-tests the CF path and only persists if it's healthy. To update
the range list, edit `V4`/`V6` in the script and re-run `--apply` — it clears its own
`:443` rich rules first, so it converges rather than stacking duplicates.

## Verifying

`--apply` checks the CF path from the box. The **direct-origin-is-blocked** check must
run from an **external, non-CF host** (from the box, the origin is "self" and allowed):

```bash
curl -s  -o /dev/null -w '%{http_code}\n' https://addypin.com/api/health   # 200 (via CF)
curl -s  -o /dev/null -w '%{http_code}\n' https://ingest.late.fyi/health   # 200 (via CF)
curl -k --max-time 8 https://155.94.144.191/                               # hangs → timeout (dropped)
```

Before the lock the last one returned `403` (nginx answered — TCP/TLS had completed);
after, it times out because the packets never reach nginx. Applied and verified this
way on 2026-07-15.
