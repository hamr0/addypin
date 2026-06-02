// Reads confirmed-pin counts from addypin.db. No decryption — no secrets needed.
//
// Two modes:
//   node --experimental-sqlite server/stats.js                 # human-readable line
//   node --experimental-sqlite server/stats.js --metrics-json  # {"pins":N,"customers":N}
//
// --metrics-json is the metricsCommand for pulselog's weekly digest
// (ops/pulselog/digest.config.json): one process spawn, one flat JSON
// object of named integers, which pulselog snapshots into stats.jsonl
// and renders as the week-over-week table. pulselog owns the history,
// rendering, and email — this file only answers "what are the numbers?".

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dataDir = process.env.DATA_DIR || './data';
const dbPath  = path.join(dataDir, 'addypin.db');
const asJson  = process.argv.includes('--metrics-json');

if (!fs.existsSync(dbPath)) {
    // pulselog records null for a metric whose command fails; exit non-zero
    // so a missing DB is noted, never silently counted as zero.
    console.error(`stats: ${dbPath} not found — start the server first to create the database`);
    process.exit(1);
}

const db = new DatabaseSync(dbPath, { readOnly: true });
const pins      = db.prepare(`SELECT COUNT(*) AS n FROM pins WHERE status = 'confirmed'`).get().n;
const customers = db.prepare(`SELECT COUNT(DISTINCT owner_handle) AS n FROM pins WHERE status = 'confirmed'`).get().n;
db.close();

if (asJson) {
    process.stdout.write(JSON.stringify({ pins, customers }) + '\n');
} else {
    const ts = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    process.stdout.write(`${ts} pins=${pins} customers=${customers}\n`);
}
