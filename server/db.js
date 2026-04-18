import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS pins (
    shortcode               TEXT PRIMARY KEY,
    coords_ciphertext       BLOB NOT NULL,
    coords_iv               BLOB NOT NULL,
    owner_email_fingerprint BLOB NOT NULL,
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
`;

export function createDb({ path }) {
    const db = new DatabaseSync(path);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(SCHEMA);

    const stmts = {
        insert: db.prepare(`
            INSERT INTO pins (
                shortcode, coords_ciphertext, coords_iv, owner_email_fingerprint,
                status, created_at, updated_at, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `),
        getByShortcode: db.prepare(`SELECT * FROM pins WHERE shortcode = ?`),
        listByOwnerConfirmed: db.prepare(`
            SELECT * FROM pins
            WHERE owner_email_fingerprint = ? AND status = 'confirmed'
            ORDER BY created_at ASC
        `),
        updateCoords: db.prepare(`
            UPDATE pins SET coords_ciphertext = ?, coords_iv = ?, updated_at = ?
            WHERE shortcode = ?
        `),
        confirm: db.prepare(`
            UPDATE pins SET status = 'confirmed', expires_at = NULL, updated_at = ?
            WHERE shortcode = ? AND status = 'unconfirmed'
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

    function insertPin({ shortcode, ciphertext, iv, fingerprint, status, createdAt, expiresAt }) {
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
        stmts.insert.run(
            shortcode, ciphertext, iv, fingerprint,
            status, createdAt, createdAt, expiresAt ?? null
        );
    }

    function getPinByShortcode(shortcode) {
        const row = stmts.getByShortcode.get(shortcode);
        return row ? toPin(row) : null;
    }

    function listPinsByOwner(fingerprint) {
        return stmts.listByOwnerConfirmed.all(fingerprint).map(toPin);
    }

    function updatePinCoords(shortcode, ciphertext, iv, now) {
        const result = stmts.updateCoords.run(ciphertext, iv, now, shortcode);
        return result.changes === 1;
    }

    function confirmPin(shortcode, now) {
        const result = stmts.confirm.run(now, shortcode);
        return result.changes === 1;
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
            return expired.length;
        });
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
        updatePinCoords, confirmPin, deletePin,
        isShortcodeAvailable, cleanupExpired, close,
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
