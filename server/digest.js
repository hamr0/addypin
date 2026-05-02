// Mail a week-over-week stats digest to the operator. Reads
// ${DATA_DIR}/stats.log (one line per day, written by stats.js),
// buckets entries into the last 4 weeks relative to "now", picks
// the latest snapshot in each bucket, and emails one row per week
// with a WoW delta. Pipes through msmtp out the same Postfix path
// as everything else.
//
// Run weekly via ops/systemd/addypin-stats-digest.{service,timer}.
// Hand-run for a one-off: node server/digest.js

import fs from 'node:fs';
import path from 'node:path';
import { msmtpTransport } from './mail.js';

const dataDir  = process.env.DATA_DIR || './data';
const logPath  = path.join(dataDir, 'stats.log');
const to       = 'avoidaccess@gmail.com';
const from     = process.env.MAIL_FROM_ADDRESS || 'noreply@addypin.com';
const fromName = process.env.MAIL_FROM_NAME    || 'addypin';
const send     = msmtpTransport({ from, fromName });

let raw = '';
try { raw = fs.readFileSync(logPath, 'utf8'); } catch (e) {
    if (e.code === 'ENOENT') { console.error(`${logPath} missing — nothing to send`); process.exit(0); }
    throw e;
}
const entries = raw.trim().split('\n').filter(Boolean).map(parseLine).filter(Boolean);
if (entries.length === 0) { console.error('stats.log empty — nothing to send'); process.exit(0); }

// Bucket by week: 0 = last 7 days, 1 = 8–14 days ago, ..., 3 = 22–28 days ago.
// Take the latest snapshot in each bucket. weeks[3] is oldest.
const now = Date.now();
const weeks = [null, null, null, null];
for (const e of entries) {
    const w = Math.floor((now - e.ts.getTime()) / (7 * 86400_000));
    if (w < 0 || w > 3) continue;
    if (!weeks[w] || e.ts > weeks[w].ts) weeks[w] = e;
}

// Format oldest → newest. Delta is vs. the older week's snapshot.
const rows = [];
for (let i = 3; i >= 0; i--) {
    const w = weeks[i];
    if (!w) { rows.push(`week-${i}: no data`); continue; }
    const prev = weeks[i + 1] ?? null;
    const dp = prev ? w.pins - prev.pins : null;
    const dc = prev ? w.customers - prev.customers : null;
    const day = w.ts.toISOString().slice(0, 10);
    const tail = (dp == null)
        ? '(baseline)'
        : `(${signed(dp)} pins, ${signed(dc)} customers WoW)`;
    rows.push(`${day}  pins=${w.pins} customers=${w.customers}  ${tail}`);
}

const subject = `addypin weekly stats — ${new Date().toISOString().slice(0, 10)}`;
const body =
    'Last 4 weeks of addypin (latest snapshot per week, UTC):\n\n' +
    rows.join('\n') + '\n';

await send(to, subject, body);

// ─── helpers ───────────────────────────────────────────────────────────────

function parseLine(line) {
    // "2026-04-30T19:25:33Z pins=5 customers=2"
    const m = line.match(/^(\S+)\s+pins=(\d+)\s+customers=(\d+)/);
    if (!m) return null;
    const ts = new Date(m[1]);
    if (isNaN(ts.getTime())) return null;
    return { ts, pins: +m[2], customers: +m[3] };
}

function signed(n) { return n >= 0 ? `+${n}` : `${n}`; }
