import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getEnv } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = getEnv().CONNECTOR_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("CONNECTOR_ENCRYPTION_KEY must be at least 32 characters");
  }
  return Buffer.from(key.slice(0, 32));
}

// SECURITY-REVIEW: encrypts connector secrets at rest with AES-256-GCM
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid encrypted payload");
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function isEncryptionConfigured(): boolean {
  const key = getEnv().CONNECTOR_ENCRYPTION_KEY;
  return Boolean(key && key.length >= 32);
}
