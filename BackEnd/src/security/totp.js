/**
 * totp.js — RFC 6238 TOTP + RFC 4648 base32, zero dependencies.
 * Uses node:crypto HMAC-SHA1 with a 30s period and 6-digit codes.
 */
import crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export const base32Encode = (buffer) => {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
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
};

export const base32Decode = (input) => {
  const cleaned = String(input).toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of cleaned) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
};

export const generateSecret = (bytes = 20) => base32Encode(crypto.randomBytes(bytes));

export const generateOtpUri = ({ secret, accountName, issuer = "DevConnect" }) =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}` +
  `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

export const generateTotp = (secret, { timestamp = Date.now(), period = 30, digits = 6 } = {}) => {
  const counter = Math.floor(timestamp / 1000 / period);
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 10 ** digits).padStart(digits, "0");
};

export const verifyTotp = (secret, token, { window = 1, timestamp = Date.now() } = {}) => {
  if (!secret || !/^\d{6}$/.test(String(token ?? "").trim())) return false;
  const normalized = String(token).trim();
  for (let offset = -window; offset <= window; offset += 1) {
    const candidate = generateTotp(secret, { timestamp: timestamp + offset * 30_000 });
    if (candidate === normalized) return true;
  }
  return false;
};
