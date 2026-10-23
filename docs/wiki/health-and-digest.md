---
title: Health checks and weekly digest
theme: health-and-digest
sources:
  - docs/archive/observability-playbook.md
---

# Health checks and weekly digest

On-VPS pulselog has two jobs, both configured in the same `pulselog.config.json`: health checks (silent on green) and a weekly stats digest.

## Health checks

The `health` section stays **silent on green** and emails `<OPERATOR_EMAIL>` on any failure (docs/archive/observability-playbook.md:227-228). Every check takes an optional `timeoutMs`, and the top-level `retry` re-probes a blip within the same run before alerting (docs/archive/observability-playbook.md:228-229).

```json
{
  "output": { "file": "<DATA_DIR>/health.jsonl", "maxBytes": 5000000, "heartbeat": false },
  "alert":  { "email": "<OPERATOR_EMAIL>", "from": "alerts@<DOMAIN>", "app": "<APP>" },
  "retry":  { "retries": 2, "retryDelayMs": 2000 },
  "checks": [
    { "type": "service", "name": "<APP>",   "unit": "<APP>.service" },
    { "type": "service", "name": "postfix", "unit": "postfix.service" },
    { "type": "service", "name": "nginx",   "unit": "nginx.service" },
    { "type": "http",    "name": "api",  "url": "http://127.0.0.1:3000/health", "expectStatus": 200, "timeoutMs": 5000 },
    { "type": "disk",    "name": "disk-root", "path": "/",          "maxPercent": 85 },
    { "type": "disk",    "name": "disk-data", "path": "<DATA_DIR>", "maxPercent": 85 },
    { "type": "ssl",     "name": "cert", "host": "<DOMAIN>", "port": 443, "warnDays": 14 },
    { "type": "command", "name": "mailq-depth", "command": "sh", "args": ["-c", "test $(mailq | grep -c '^[A-F0-9]') -lt 50"] }
  ]
}
```
(docs/archive/observability-playbook.md:231-247)

Available check types: `service`, `http`, `tcp`, `ssl`, `disk`, `file-age`, `command`. `command` is the escape hatch for anything else; it just needs exit 0 = healthy (docs/archive/observability-playbook.md:248-250).

## Weekly digest

The `digest` section lives in the same config file. One weekly run collects metrics, appends **one `kind:"stats"` line** to a history file, and emails a week-over-week table plus a flightlog error rollup (docs/archive/observability-playbook.md:256-258). Since pulselog 0.8.0 it also appends a `kind:"delivery"` line to the same history file after each snapshot, recording whether the email went out (with a `reason` on failure: timeout, `exit N`, errno, `no-mta`, signal). Health and digest now exit 1 when a send was attempted and all delivery paths failed (green runs exit 0), so the unit shows failed. The send is bounded by `mailTimeoutMs` (default 30000). Verify the alert path with `--test-alert` ([verify and troubleshoot](verify-and-troubleshoot.md)).

```json
{
  "digest": {
    "app": "<APP>",
    "history": "<DATA_DIR>/stats.jsonl",
    "email": "<OPERATOR_EMAIL>",
    "from": "noreply@<DOMAIN>",
    "weeks": 4,
    "skipIfFlat": false,

    "metricsCommand": {
      "command": "/usr/bin/node",
      "args": ["--experimental-sqlite", "<APP_DIR>/bin/stats.js", "--metrics-json"],
      "timeoutMs": 10000
    },
    "metrics": [
      { "name": "users" },
      { "name": "active_7d" }
    ],

    "flightlog": { "file": "<DATA_DIR>/errors.jsonl", "groupBy": "where", "flagAtLeast": 20 }
  }
}
```
(docs/archive/observability-playbook.md:260-283)

### "Email me if there are >20 of the same error"

This is the `flightlog` block (docs/archive/observability-playbook.md:285):

- `flagAtLeast: 20` flags, in the digest, any group whose **7-day count reaches 20**. The default is 20; set whatever threshold you want (docs/archive/observability-playbook.md:286-287).
- `groupBy: "where"` groups by your flightlog `where` field ([app-capture-and-metrics.md](app-capture-and-metrics.md)). Use `"name"` (the default) to group by error class/name instead (docs/archive/observability-playbook.md:288-289).
- **Counts and names only** ever reach the email, never messages or stacks, since those can carry PII. That privacy invariant is mutation-tested in pulselog (docs/archive/observability-playbook.md:290-291).

### Metrics

Each `metrics[]` entry with no `command` of its own is filled **by name** from the single `metricsCommand` JSON, which means one process spawn for all numbers. Alternatively, give a metric its own `command` that prints one integer (docs/archive/observability-playbook.md:293-295).

### Cadence versus table

Cadence and table are decoupled. The digest run *is* the weekly snapshot; `weeks` only controls how many rows the table shows (docs/archive/observability-playbook.md:297-298). `skipIfFlat: true` suppresses the email in weeks where every Δ=0 and nothing is flagged; leave it `false` for a weekly proof-of-life (docs/archive/observability-playbook.md:298-300). Preview any time without sending:

```bash
pulselog --digest --dry-run --config <APP_DIR>/pulselog.config.json
```
(docs/archive/observability-playbook.md:300-303)

Back to the overview: [observability playbook](observability-playbook.md)
