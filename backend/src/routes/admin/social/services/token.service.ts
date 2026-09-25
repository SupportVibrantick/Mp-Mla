import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const MASTER_SECRET = process.env.SOCIAL_VAULT_KEY || (process.env.NODE_ENV === "production" ? "" : "constituency_dev_vault_key_32b!");

function getEncryptionKey(): Buffer {
  if (!MASTER_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("SOCIAL_VAULT_KEY environment variable is strictly required in production.");
  }
  return crypto.createHash("sha256").update(MASTER_SECRET || "dev_key_fallback_only").digest();
}

/**
 * Encrypts sensitive OAuth token using AES-256-GCM
 */
export function encryptToken(plainToken: string): {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: string;
} {
  if (!plainToken) {
    throw new Error("Token string is required for encryption");
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainToken, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return {
    ciphertext: encrypted,
    iv: iv.toString("hex"),
    authTag,
    keyVersion: "v1",
  };
}

/**
 * Decrypts token using AES-256-GCM (fails closed on invalid key/tag)
 */
export function decryptToken(
  ciphertext: string,
  ivHex?: string | null,
  authTagHex?: string | null
): string {
  if (!ciphertext) {
    throw new Error("Ciphertext is required for decryption");
  }

  if (!ivHex || !authTagHex) {
    // If no IV/tag stored, fail closed
    throw new Error("Missing IV or authTag for secure AES-256-GCM decryption");
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Token decryption error (Fail-Closed):", error);
    throw new Error("Failed to decrypt secure token: Invalid authentication tag or key");
  }
}
