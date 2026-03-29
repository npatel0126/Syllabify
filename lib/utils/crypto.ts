/**
 * lib/utils/crypto.ts
 * AES-256-GCM encrypt / decrypt for storing Google OAuth refresh tokens.
 * Key is taken from ENCRYPTION_SECRET env var (must be exactly 32 chars / 256 bits).
 * SERVER-ONLY — never import in client components.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET ?? "";
  // If it looks like a 64-char hex string (from `openssl rand -hex 32`), decode it as hex.
  if (/^[0-9a-f]{64}$/i.test(secret)) {
    return Buffer.from(secret, "hex"); // → exactly 32 bytes
  }
  // Fallback: treat as UTF-8, pad/truncate to 32 bytes
  return Buffer.from(secret.padEnd(32, "0").slice(0, 32), "utf8");
}

/** Returns a hex string: iv(24) + authTag(32) + ciphertext */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

/** Reverses encrypt() */
export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, dataHex] = ciphertext.split(":");
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
