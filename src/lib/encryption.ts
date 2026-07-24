import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || "cdw-dev-encryption-key-32chars!!";
  return crypto.createHash("sha256").update(secret).digest();
}

/** AES-256-GCM encryption for uploads and sensitive payloads */
export function encryptPayload(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptPayload(ciphertext: string): string {
  const data = Buffer.from(ciphertext, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

/** Create irreversible anonymised reporter ID */
export function anonymiseReporter(userId?: string | null, salt?: string): string {
  const seed = userId || crypto.randomUUID();
  const material = `${seed}:${salt || process.env.ANONYMISATION_SALT || "cdw-anon"}`;
  return `anon_${crypto.createHash("sha256").update(material).digest("hex").slice(0, 16)}`;
}

/** Encrypt offline survey drafts for local storage */
export function encryptOfflineDraft(data: unknown): string {
  return encryptPayload(JSON.stringify(data));
}

export function decryptOfflineDraft<T>(ciphertext: string): T {
  return JSON.parse(decryptPayload(ciphertext)) as T;
}
