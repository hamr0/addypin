import crypto from 'node:crypto';

export function createCrypto({ dataKey, emailKey, signingKey }) {
    assertKey(dataKey, 'dataKey');
    assertKey(emailKey, 'emailKey');
    assertKey(signingKey, 'signingKey');

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

    function fingerprint(email) {
        if (typeof email !== 'string' || !email.includes('@')) {
            throw new Error('email must be a string containing @');
        }
        const normalized = email.trim().toLowerCase();
        return crypto.createHmac('sha256', emailKey).update(normalized, 'utf8').digest();
    }

    function signToken(payload, ttlSec) {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            throw new Error('payload must be a plain object');
        }
        if (typeof ttlSec !== 'number' || !Number.isFinite(ttlSec)) {
            throw new Error('ttlSec must be a finite number');
        }
        const exp = Math.floor(Date.now() / 1000) + Math.floor(ttlSec);
        const body = JSON.stringify({ ...payload, exp });
        const bodyB64 = Buffer.from(body, 'utf8').toString('base64url');
        const sig = crypto.createHmac('sha256', signingKey).update(bodyB64).digest('base64url');
        return `${bodyB64}.${sig}`;
    }

    function verifyToken(token) {
        if (typeof token !== 'string') return null;
        const dot = token.indexOf('.');
        if (dot < 1 || dot === token.length - 1) return null;
        const bodyB64 = token.slice(0, dot);
        const sig = token.slice(dot + 1);

        const expected = crypto.createHmac('sha256', signingKey).update(bodyB64).digest('base64url');
        const sigBuf = Buffer.from(sig, 'base64url');
        const expBuf = Buffer.from(expected, 'base64url');
        if (sigBuf.length !== expBuf.length) return null;
        if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

        let body;
        try {
            body = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8'));
        } catch {
            return null;
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
        if (typeof body.exp !== 'number' || body.exp < Math.floor(Date.now() / 1000)) return null;
        return body;
    }

    return { encryptCoords, decryptCoords, encryptEmail, decryptEmail, fingerprint, signToken, verifyToken };
}

function assertKey(key, name) {
    if (!Buffer.isBuffer(key) || key.length !== 32) {
        throw new Error(`${name} must be a 32-byte Buffer`);
    }
}
