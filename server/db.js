import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS pins (
    shortcode               TEXT PRIMARY KEY,
    coords_ciphertext       BLOB NOT NULL,
    coords_iv               BLOB NOT NULL,
    owner_email_fingerprint BLOB NOT NULL,
    owner_email_ciphertext  BLOB,
    owner_email_iv          BLOB,
    reminder_sent_at        INTEGER,
    status                  TEXT NOT NULL CHECK (status IN ('unconfirmed', 'confirmed')),
    created_at              INTEGER NOT NULL,
    updated_at              INTEGER NOT NULL,
    expires_at              INTEGER
);
CREATE INDEX IF NOT EXISTS idx_owner_fp ON pins (owner_email_fingerprint);
CREATE INDEX IF NOT EXISTS idx_expires  ON pins (expires_at) WHERE expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS retired_shortcodes (
    shortcode  TEXT PRIMARY KEY,
    retired_at INTEGER NOT NULL
);

-- One-time-use record for magic login links. Token hash is stored; the
-- row is inserted on first click and rejected thereafter. Rows live
-- until expiry + 1h, then cleanupExpired drops them.
CREATE TABLE IF NOT EXISTS consumed_tokens (
    token_hash TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL
);
`;

// Additive migrations for DBs created before these columns existed.
// SQLite raises "duplicate column" on re-run — swallow that specific case.
function applyMigrations(db) {
    for (const sql of [
        `ALTER TABLE pins ADD COLUMN owner_email_ciphertext BLOB`,
        `ALTER TABLE pins ADD COLUMN owner_email_iv         BLOB`,
        `ALTER TABLE pins ADD COLUMN reminder_sent_at       INTEGER`,
    ]) {
        try { db.exec(sql); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
    }
}

export function createDb({ path }) {
    const db = new DatabaseSync(path);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(SCHEMA);
    applyMigrations(db);

    const stmts = {
        insert: db.prepare(`
            INSERT INTO pins (
                shortcode, coords_ciphertext, coords_iv, owner_email_fingerprint,
                owner_email_ciphertext, owner_email_iv,
                status, created_at, updated_at, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `),
        getByShortcode: db.prepare(`SELECT * FROM pins WHERE shortcode = ?`),
        listByOwner: db.prepare(`
            SELECT * FROM pins
            WHERE owner_email_fingerprint = ?
            ORDER BY created_at ASC
        `),
        updateCoords: db.prepare(`
            UPDATE pins SET coords_ciphertext = ?, coords_iv = ?, updated_at = ?
            WHERE shortcode = ?
        `),
        confirm: db.prepare(`
            UPDATE pins SET
                status = 'confirmed', expires_at = NULL, updated_at = ?,
                owner_email_ciphertext = NULL, owner_email_iv = NULL,
                reminder_sent_at = NULL
            WHERE shortcode = ? AND status = 'unconfirmed'
        `),
        confirmAllByOwner: db.prepare(`
            UPDATE pins SET
                status = 'confirmed', expires_at = NULL, updated_at = ?,
                owner_email_ciphertext = NULL, owner_email_iv = NULL,
                reminder_sent_at = NULL
            WHERE owner_email_fingerprint = ? AND status = 'unconfirmed'
        `),
        // Pins needing a reminder: unconfirmed, within the reminder window,
        // not yet sent, and still holding an encrypted email to send to.
        // Window: reminderAt <= expires_at <= cutoffAt  (i.e. <=24h remaining)
        listPinsNeedingReminder: db.prepare(`
            SELECT shortcode, owner_email_ciphertext, owner_email_iv, expires_at
            FROM pins
            WHERE status = 'unconfirmed'
              AND reminder_sent_at IS NULL
              AND owner_email_ciphertext IS NOT NULL
              AND expires_at > ?
              AND expires_at <= ?
        `),
        markReminderSent: db.prepare(`
            UPDATE pins SET reminder_sent_at = ? WHERE shortcode = ?
        `),
        // Returns 1 if the insert succeeded (first-use). If it conflicts
        // on primary key (token_hash already stored) → 0, meaning the
        // token has already been consumed and should be rejected.
        consumeToken: db.prepare(`
            INSERT OR IGNORE INTO consumed_tokens (token_hash, expires_at) VALUES (?, ?)
        `),
        cleanupConsumedTokens: db.prepare(`
            DELETE FROM consumed_tokens WHERE expires_at < ?
        `),
        delete: db.prepare(`DELETE FROM pins WHERE shortcode = ?`),
        retire: db.prepare(`
            INSERT OR IGNORE INTO retired_shortcodes (shortcode, retired_at) VALUES (?, ?)
        `),
        existsInPins: db.prepare(`SELECT 1 AS x FROM pins WHERE shortcode = ?`),
        existsInRetired: db.prepare(`SELECT 1 AS x FROM retired_shortcodes WHERE shortcode = ?`),
        listExpiredUnconfirmed: db.prepare(`
            SELECT shortcode FROM pins WHERE status = 'unconfirmed' AND expires_at < ?
        `),
    };

    function insertPin({
        shortcode, ciphertext, iv, fingerprint, status, createdAt, expiresAt,
        emailCiphertext = null, emailIv = null,
    }) {
        if (!isAvailable(shortcode)) {
            throw new Error(`shortcode '${shortcode}' is unavailable`);
        }
        if (status !== 'unconfirmed' && status !== 'confirmed') {
            throw new Error(`status must be 'unconfirmed' or 'confirmed'`);
        }
        if (status === 'unconfirmed' && expiresAt == null) {
            throw new Error('unconfirmed pins must have an expiresAt');
        }
        if (status === 'confirmed' && expiresAt != null) {
            throw new Error('confirmed pins must have expiresAt = null');
        }
        // Confirmed pins never carry a reversible owner email — that's the
        // whole point of the minimum-data posture. Only the unconfirmed 72h
        // window stores one, so we can send the 48h reminder.
        if (status === 'confirmed' && (emailCiphertext || emailIv)) {
            throw new Error('confirmed pins must not carry an owner email');
        }
        stmts.insert.run(
            shortcode, ciphertext, iv, fingerprint,
            emailCiphertext, emailIv,
            status, createdAt, createdAt, expiresAt ?? null
        );
    }

    function getPinByShortcode(shortcode) {
        const row = stmts.getByShortcode.get(shortcode);
        return row ? toPin(row) : null;
    }

    function listPinsByOwner(fingerprint) {
        return stmts.listByOwner.all(fingerprint).map(toPin);
    }

    function updatePinCoords(shortcode, ciphertext, iv, now) {
        const result = stmts.updateCoords.run(ciphertext, iv, now, shortcode);
        return result.changes === 1;
    }

    function confirmPin(shortcode, now) {
        const result = stmts.confirm.run(now, shortcode);
        return result.changes === 1;
    }

    function confirmPinsByOwner(fingerprint, now) {
        return stmts.confirmAllByOwner.run(now, fingerprint).changes;
    }

    function deletePin(shortcode, now) {
        return transact(() => {
            const result = stmts.delete.run(shortcode);
            if (result.changes === 0) return false;
            stmts.retire.run(shortcode, now);
            return true;
        });
    }

    function isShortcodeAvailable(shortcode) {
        return isAvailable(shortcode);
    }

    function cleanupExpired(now) {
        return transact(() => {
            const expired = stmts.listExpiredUnconfirmed.all(now);
            for (const { shortcode } of expired) {
                stmts.retire.run(shortcode, now);
                stmts.delete.run(shortcode);
            }
            stmts.cleanupConsumedTokens.run(now);
            return expired.length;
        });
    }

    // Returns true if the token was just consumed for the first time.
    // Returns false if it had already been consumed (reject the caller).
    function consumeToken(tokenHash, tokenExpSec) {
        return stmts.consumeToken.run(tokenHash, tokenExpSec).changes === 1;
    }

    function listPinsNeedingReminder(now, windowSec) {
        const cutoffAt = now + windowSec; // expires within the window
        return stmts.listPinsNeedingReminder.all(now, cutoffAt).map((r) => ({
            shortcode: r.shortcode,
            emailCiphertext: Buffer.from(r.owner_email_ciphertext),
            emailIv: Buffer.from(r.owner_email_iv),
            expiresAt: r.expires_at,
        }));
    }

    function markReminderSent(shortcode, now) {
        return stmts.markReminderSent.run(now, shortcode).changes === 1;
    }

    function transact(fn) {
        db.exec('BEGIN');
        try {
            const result = fn();
            db.exec('COMMIT');
            return result;
        } catch (e) {
            db.exec('ROLLBACK');
            throw e;
        }
    }

    function isAvailable(shortcode) {
        return !stmts.existsInPins.get(shortcode) && !stmts.existsInRetired.get(shortcode);
    }

    function close() {
        db.close();
    }

    return {
        insertPin, getPinByShortcode, listPinsByOwner,
        updatePinCoords, confirmPin, confirmPinsByOwner, deletePin,
        isShortcodeAvailable, cleanupExpired,
        listPinsNeedingReminder, markReminderSent,
        consumeToken,
        close,
    };
}

function toPin(row) {
    return {
        shortcode: row.shortcode,
        ciphertext: Buffer.from(row.coords_ciphertext),
        iv: Buffer.from(row.coords_iv),
        fingerprint: Buffer.from(row.owner_email_fingerprint),
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        expiresAt: row.expires_at,
    };
}
