import crypto from "crypto";
// @ts-ignore
import { generateQrSvg } from "@/lib/qrcodegen";
import { NOMBRE_MARCA } from "@/lib/marca";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Codifica un Buffer en Base32 RFC 4648 sin padding para claves TOTP
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
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

/**
 * Decodifica una clave Base32 RFC 4648 a Buffer
 */
export function base32Decode(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, "").replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
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

/**
 * Genera una clave secreta aleatoria en Base32 (20 bytes = 160 bits, estándar Google Authenticator)
 */
export function generateTotpSecret(numBytes = 20): string {
  return base32Encode(crypto.randomBytes(numBytes));
}

/**
 * Formatea la clave Base32 en grupos legibles para entrada manual
 */
export function formatTotpSecret(secret: string): string {
  const clean = secret.replace(/\s+/g, "").toUpperCase();
  return clean.match(/.{1,4}/g)?.join(" ") || clean;
}

/**
 * Genera el código TOTP RFC 6238 de 6 dígitos para una marca de tiempo dada
 */
export function generateTOTP(secret: string, timeStep = 30, forTime = Date.now()): string {
  const counter = Math.floor(forTime / 1000 / timeStep);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const key = base32Decode(secret);
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1000000).toString().padStart(6, "0");
}

/**
 * Verifica un código TOTP de 6 dígitos con ventana de tolerancia (+/- window pasos de 30s)
 */
export function verifyTOTP(token: string | number, secret: string, window = 1): boolean {
  if (!token || !secret) return false;
  const cleanToken = token.toString().trim().replace(/\D/g, "");
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

/**
 * Construye la URI otpauth estándar para Google Authenticator
 */
export function getTotpUri(
  correo: string,
  secret: string,
  issuer: string = NOMBRE_MARCA
): string {
  const label = encodeURIComponent(`${issuer}:${correo}`);
  const cleanSecret = secret.replace(/\s+/g, "").toUpperCase();
  const cleanIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${cleanSecret}&issuer=${cleanIssuer}&period=30&digits=6`;
}

/**
 * Genera el SVG del código QR para escanear en la app de autenticación
 */
export function getTotpQrSvg(
  correo: string,
  secret: string,
  issuer: string = NOMBRE_MARCA,
  border = 4
): string {
  const uri = getTotpUri(correo, secret, issuer);
  return generateQrSvg(uri, border);
}
