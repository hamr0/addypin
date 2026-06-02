// One-shot: convert the legacy text stats.log into pulselog's stats.jsonl
// so the first weekly digest keeps its week-over-week history instead of
// starting from a bare baseline. Run ONCE on the VPS before enabling the
// new addypin-stats-digest timer:
//
//   DATA_DIR=/var/lib/addypin node ops/pulselog/migrate-stats-log.mjs
//
// Idempotent by refusal: if stats.jsonl already exists it does nothing, so
// it can never double-append onto a history pulselog has started writing.
// Safe to delete this file once the migration has run in production.

import fs from 'node:fs';
import path from 'node:path';

const dataDir = process.env.DATA_DIR || './data';
const src = path.join(dataDir, 'stats.log');
const dst = path.join(dataDir, 'stats.jsonl');

if (fs.existsSync(dst)) {
    console.error(`${dst} already exists — refusing to touch it. Nothing to do.`);
    process.exit(0);
}
let raw;
try {
    raw = fs.readFileSync(src, 'utf8');
} catch (e) {
    if (e.code === 'ENOENT') { console.error(`${src} not found — nothing to migrate.`); process.exit(0); }
    throw e;
}

// "2026-04-30T19:25:33Z pins=5 customers=2" → pulselog snapshot line.
const lines = [];
for (const line of raw.split('\n')) {
    const m = line.match(/^(\S+)\s+pins=(\d+)\s+customers=(\d+)/);
    if (!m) continue;
    lines.push(JSON.stringify({
        ts: m[1], kind: 'stats', app: 'addypin', pins: +m[2], customers: +m[3],
    }));
}
if (lines.length === 0) { console.error(`${src} had no parseable rows — nothing written.`); process.exit(0); }

fs.writeFileSync(dst, lines.join('\n') + '\n', { mode: 0o600 });
console.error(`Wrote ${lines.length} snapshot line(s) → ${dst}`);
