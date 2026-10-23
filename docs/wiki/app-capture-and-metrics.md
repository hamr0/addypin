---
title: App capture and metrics
theme: app-capture-and-metrics
sources:
  - docs/archive/observability-playbook.md
---

# App capture and metrics

Wiring flightlog into the app for in-app error capture, plus the app-specific stats command.

## flightlog: in-app error capture

Wire it once, as early in startup as possible, right after loading env/secrets. It registers global handlers and hands you `capture()` / `captureSync()`. (docs/archive/observability-playbook.md:146-149)

### Long-lived process (server)

```js
import { install } from 'flightlog';
import path from 'node:path';

const { capture } = install({
  file: path.join(process.env.DATA_DIR || './data', 'errors.jsonl'),
  context: { app: '<APP>', proc: 'server', release: process.env.RELEASE },
});

// uncaught exceptions log synchronously then exit(1) (systemd restarts clean);
// unhandled rejections log and stay alive. For the errors you catch yourself:
try { await risky(); }
catch (e) { capture(e, { where: 'checkout' }); }   // fire-and-forget, never throws
```

(docs/archive/observability-playbook.md:151-165)

- Uncaught exceptions log synchronously then `exit(1)`, so systemd restarts clean. Unhandled rejections log and the process stays alive. (docs/archive/observability-playbook.md:161-162)
- `capture()` is fire-and-forget and never throws. (docs/archive/observability-playbook.md:164)

### Short-lived process (cron job, mail pipe, CLI)

Use `captureSync` so the line flushes before you exit. (docs/archive/observability-playbook.md:167-168)

```js
const { captureSync } = install({
  file: path.join(process.env.DATA_DIR || './data', 'errors.jsonl'),
  context: { app: '<APP>', proc: 'inbound' },
});
try { main(); }
catch (e) { captureSync(e, { where: 'inbound' }); process.exit(1); }
// captureSync returns { ok, errno? } — check it if the exit code should reflect
// whether the error actually landed on disk.
```

(docs/archive/observability-playbook.md:169-178)

### The `where` field

`where` is the grouping key for the weekly "at least N of the same error" rollup (section 6 of the playbook). Give each call site a stable, low-cardinality `where` (e.g. `checkout`, `sweep-cleanup`), not the error message. (docs/archive/observability-playbook.md:180-182)

### Untrusted input

Never spread untrusted objects into `context`/`capture()` extras. Keys like `ts`/`kind`/`name`/`message`/`stack` would shadow core fields. Pass an allow-listed set of fields, never a raw request/payload object. Values are JSON-escaped (safe), but your own keys can clobber. (docs/archive/observability-playbook.md:184-187)

### File

`errors.jsonl` is written `0600`. Point every process at the same file (or a per-proc file) under `<DATA_DIR>`. (docs/archive/observability-playbook.md:189-190)

## The stats command: generic growth metrics

The digest's job is "is it growing?" You provide the numbers via one command that prints a flat JSON object of named integers. That is the only app-specific code in the whole setup. (docs/archive/observability-playbook.md:196-198)

`bin/stats.js` can be any language, but must print JSON to stdout and exit 0: (docs/archive/observability-playbook.md:200)

```js
// node --experimental-sqlite bin/stats.js --metrics-json
// prints e.g. {"users":128,"active_7d":54,"orders":true→count}
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync(process.env.DB_PATH, { readOnly: true });
const n = (sql) => db.prepare(sql).get().n;
const metrics = {
  users:     n(`SELECT COUNT(*) AS n FROM users`),
  active_7d: n(`SELECT COUNT(*) AS n FROM users WHERE last_seen > date('now','-7 days')`),
};
db.close();
process.stdout.write(JSON.stringify(metrics) + '\n');
```

(docs/archive/observability-playbook.md:200-213)

### Rules for privacy and robustness

- Counts only, via `SELECT COUNT(*)`. Nothing is recorded that was not already a row. (docs/archive/observability-playbook.md:216)
- Read-only: open the DB read-only and never mutate from a stats run. (docs/archive/observability-playbook.md:217)
- Exit non-zero if the source is missing (e.g. DB not found), so pulselog records `null` for that metric instead of a silent zero. (docs/archive/observability-playbook.md:218-219)
- Not a database? Any command works (`wc -l`, a `curl … | jq`, etc.) as long as the final stdout is one flat JSON object of integers. (docs/archive/observability-playbook.md:220-221)

Back to the overview: [observability playbook](observability-playbook.md)
