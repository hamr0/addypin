---
title: Verify and troubleshoot
theme: verify-and-troubleshoot
sources:
  - docs/archive/observability-playbook.md
---

# Verify and troubleshoot

Verification steps and the failure-mode troubleshooting table. (docs/archive/observability-playbook.md:483-514) (docs/archive/observability-playbook.md:515-530)

## Verify everything

Run these to confirm each piece works: flightlog, health, digest (dry and real), mail, timers, and the backup host. (docs/archive/observability-playbook.md:485-507)

```bash
# flightlog: force an error, confirm a line lands
node -e "import('flightlog').then(f=>{const {captureSync}=f.install({file:'/tmp/e.jsonl'});captureSync(new Error('x'),{where:'test'})})"; cat /tmp/e.jsonl

# health: exit 0 + silent when green
node <APP_DIR>/node_modules/pulselog/bin/pulselog.js --config <APP_DIR>/pulselog.config.json; echo "exit=$?"

# digest: render without sending (does NOT exercise the unit's sandbox or mail path)
node <APP_DIR>/node_modules/pulselog/bin/pulselog.js --digest --dry-run --config <APP_DIR>/pulselog.config.json

# digest: real send through the installed unit (sandbox + mail path)
sudo systemctl start <APP>-stats-digest.service
systemctl status <APP>-stats-digest.service --no-pager   # want: finished, not stuck "activating"
sudo grep -E 'status=(sent|deferred|bounced)' /var/log/maillog | tail -3   # want status=sent

# mail: real send ([mail-deliverability.md](mail-deliverability.md), end-to-end proof) → want status=sent
# timers: are they actually scheduled?
systemctl list-timers '<APP>-*'

# backup host:
sudo /usr/local/bin/pulselog --backup --config /etc/<APP>/pulselog.config.json
ls -la ~/<APP>-backups/*.tar.gz
```

Notes on the digest steps:

- The `--dry-run` digest renders without sending and does NOT exercise the unit's sandbox or mail path. (docs/archive/observability-playbook.md:492-493)
- The real-send step starts the installed unit; you want it finished, not stuck "activating", and `status=sent` in the maillog. (docs/archive/observability-playbook.md:495-498)
- A `--dry-run` passes in exactly the `NoNewPrivileges`/postdrop hang case, so it can't validate the unit. (docs/archive/observability-playbook.md:509-510)
- The real run appends an extra row to `stats.jsonl` (the snapshot is written before the send), so run it knowingly. (docs/archive/observability-playbook.md:510-511)
- Since pulselog 0.8.0 the digest also appends a `kind:"delivery"` line to the history file after each stats snapshot. That line is where a digest's delivery outcome lives; on failure it carries a `reason` (`timeout`, `exit N`, an errno, `no-mta`, or `signal`). pulselog's own week table ignores it.

### Test the alert path with `--test-alert` (pulselog 0.8.0+)

`pulselog --test-alert [--digest|--backup] --config ...` sends one test message through the primary path AND the fallback, prints each path's result, writes no JSONL, and exits 1 if any configured path fails. It rejects `--dry-run`, and `--digest` with `--backup` together, as usage errors. Run it under the real unit sandbox, not by hand as root (a root shell passes in exactly the `NoNewPrivileges`/postdrop case the sandbox breaks). Copy the unit to a transient name, swap `ExecStart`, start it, read the journal, then delete the copy:

```bash
# health alert path (use the digest unit and add --digest for the digest path)
sudo cp /etc/systemd/system/<APP>-health.service /etc/systemd/system/<APP>-testalert.service
sudo sed -i '/^ExecStart=/ s|$| --test-alert|' /etc/systemd/system/<APP>-testalert.service
#   digest: copy <APP>-stats-digest.service and append ' --test-alert --digest'
sudo systemctl daemon-reload
sudo systemctl start <APP>-testalert.service; echo "exit=$?"   # want 0
sudo journalctl -u <APP>-testalert.service --no-pager | tail   # per-path results
sudo rm /etc/systemd/system/<APP>-testalert.service && sudo systemctl daemon-reload
```

This supersedes hand-rolled `systemd-run` mail tests for confirming the primary and fallback paths. On the backup host, run `pulselog --test-alert --backup --config /etc/<APP>/pulselog.config.json` (see [`ops/homeserver/README.md`](../../ops/homeserver/README.md)).

## Troubleshooting: the failure modes (learned the hard way)

The table below lists each symptom with its likely cause and the check or fix. (docs/archive/observability-playbook.md:515-527)

| Symptom | Likely cause | Check / fix |
|---|---|---|
| Digest/alerts never arrive, but timers ran | **Mail bounces at recipient** | `grep '<OPERATOR_EMAIL>' /var/log/maillog \| grep bounced` → fix, see [mail-deliverability.md](mail-deliverability.md) |
| Bounce `5.7.25` | PTR missing or forward≠reverse (often a **proxied mail host**) | [mail-deliverability.md](mail-deliverability.md) (PTR / reverse DNS); `dig A <MAIL_HOST>` must be `<VPS_IP>`, not a CDN IP |
| Bounce `5.7.26` | SPF and DKIM both fail | [mail-deliverability.md](mail-deliverability.md) (SPF / DKIM); `dig TXT <DKIM_SELECTOR>._domainkey.<DOMAIN>` must be non-empty |
| Timer never fired | unit not installed / not enabled | `systemctl list-timers '<APP>-*'`; install units + `daemon-reload` + `enable --now` |
| `pulselog.js: not found` on the VPS | `npm ci --omit=dev` skipped it | pulselog must be in **`dependencies`**, not `devDependencies` |
| pulselog refuses the config | 0.4.x **config-ownership gate** | config must be owned by the running user **or root**, and not group/world-writable |
| Digest metric shows `null` | metric command failed / DB missing | run the `metricsCommand` by hand; it must print flat JSON and exit 0 |
| Can't find last week's run in `journalctl` | journal rotated | the durable record is the JSONL (`stats.jsonl` / `health.jsonl`), not the journal |
| On-VPS mail-bounce check false-alarms | runs as `<APP_USER>` (can't read maillog) + circular | move it **off-box** ([offbox-backup-watch.md](offbox-backup-watch.md), mail-delivery watchdog) — don't grant the service user log access |

Table source: (docs/archive/observability-playbook.md:517-527)

Back to the overview: [observability playbook](observability-playbook.md)
