// Counts rows in addypin.db. No decryption — no secrets needed.
//
// Usage:
//   node --experimental-sqlite server/stats.js              # print once
//   node --experimental-sqlite server/stats.js --watch 600  # print every 600s
//
// To background-log:
//   nohup node --experimental-sqlite server/stats.js --watch 600 \
//     >> data/stats.log 2>&1 &

import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dataDir = process.env.DATA_DIR || './data';
const dbPath  = path.join(dataDir, 'addypin.db');

const args = process.argv.slice(2);
const watchIdx = args.indexOf('--watch');
const intervalSec = watchIdx >= 0 ? parseInt(args[watchIdx + 1] ?? '600', 10) : 0;

const db = new DatabaseSync(dbPath, { readOnly: true });
const stmts = {
    pins:      db.prepare(`SELECT COUNT(*) AS n FROM pins WHERE status = 'confirmed'`),
    customers: db.prepare(`SELECT COUNT(DISTINCT owner_handle) AS n FROM pins WHERE status = 'confirmed'`),
};

function snapshot() {
    const ts = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const pins      = stmts.pins.get().n;
    const customers = stmts.customers.get().n;
    process.stdout.write(`${ts} pins=${pins} customers=${customers}\n`);
}

snapshot();

if (intervalSec > 0) {
    const timer = setInterval(snapshot, intervalSec * 1000);
    for (const sig of ['SIGINT', 'SIGTERM']) {
        process.on(sig, () => { clearInterval(timer); db.close(); process.exit(0); });
    }
} else {
    db.close();
}
