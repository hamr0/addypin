import crypto from 'node:crypto';

// Slimmed for the knowless integration. knowless owns identity derivation
// (handles via HMAC) and one-time tokens for magic links. addypin keeps
// only what's left over: AES-GCM for coords, AES-GCM for the encrypted
// owner email persisted during the 72h unconfirmed window (decrypted by
// the 48h reminder pass to compose the reminder mail).
export function createCrypto({ dataKey }) {
    assertKey(dataKey, 'dataKey');

    function encryptCoords(lat, lng) {
        if (typeof lat !== 'number' || typeof lng !== 'number' ||
            !Number.isFinite(lat) || !Number.isFinite(lng)) {
            throw new Error('lat and lng must be finite numbers');
        }
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, iv);
        const body = Buffer.concat([cipher.update(`${lat},${lng}`, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return { ciphertext: Buffer.concat([body, tag]), iv };
    }

    function decryptCoords(ciphertext, iv) {
        if (!Buffer.isBuffer(ciphertext) || ciphertext.length <= 16) {
            throw new Error('invalid ciphertext');
        }
        if (!Buffer.isBuffer(iv) || iv.length !== 12) {
            throw new Error('invalid iv');
        }
        const tag = ciphertext.subarray(ciphertext.length - 16);
        const body = ciphertext.subarray(0, ciphertext.length - 16);
        const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey, iv);
        decipher.setAuthTag(tag);
        const plaintext = Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
        const [latStr, lngStr, ...rest] = plaintext.split(',');
        if (rest.length > 0) throw new Error('ciphertext has unexpected shape');
        const lat = Number(latStr);
        const lng = Number(lngStr);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            throw new Error('ciphertext did not yield a valid lat/lng pair');
        }
        return { lat, lng };
    }

    function encryptEmail(email) {
        if (typeof email !== 'string') throw new Error('email must be a string');
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, iv);
        const body = Buffer.concat([cipher.update(email, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return { ciphertext: Buffer.concat([body, tag]), iv };
    }

    function decryptEmail(ciphertext, iv) {
        if (!Buffer.isBuffer(ciphertext) || ciphertext.length <= 16) throw new Error('invalid ciphertext');
        if (!Buffer.isBuffer(iv) || iv.length !== 12) throw new Error('invalid iv');
        const tag = ciphertext.subarray(ciphertext.length - 16);
        const body = ciphertext.subarray(0, ciphertext.length - 16);
        const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
    }

    return { encryptCoords, decryptCoords, encryptEmail, decryptEmail };
}

function assertKey(key, name) {
    if (!Buffer.isBuffer(key) || key.length !== 32) {
        throw new Error(`${name} must be a 32-byte Buffer`);
    }
}
