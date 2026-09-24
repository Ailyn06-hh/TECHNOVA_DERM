const crypto = require('crypto');
const fs = require('fs');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(base32) {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateTotpSecret(numBytes = 20) {
  return base32Encode(crypto.randomBytes(numBytes));
}

function formatTotpSecret(secret) {
  return secret.replace(/\s+/g, '').match(/.{1,4}/g)?.join(' ') || secret;
}

function generateTOTP(secret, timeStep = 30, forTime = Date.now()) {
  const counter = Math.floor(forTime / 1000 / timeStep);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const key = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1000000).toString().padStart(6, '0');
}

function verifyTOTP(token, secret, window = 1) {
  if (!token || !secret) return false;
  const cleanToken = token.toString().trim().replace(/\D/g, '');
  if (cleanToken.length !== 6) return false;

  const now = Date.now();
  for (let offset = -window; offset <= window; offset++) {
    const checkTime = now + offset * 30 * 1000;
    if (generateTOTP(secret, 30, checkTime) === cleanToken) {
      return true;
    }
  }
  return false;
}

const secret = generateTotpSecret();
console.log('Secret:', secret, 'Formatted:', formatTotpSecret(secret));
const code = generateTOTP(secret);
console.log('Code:', code);
console.log('Valid:', verifyTOTP(code, secret));
console.log('Invalid:', verifyTOTP('000000', secret));
