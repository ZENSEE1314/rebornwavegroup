import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;
// A fixed salt is fine here: the key comes from a long server-side secret, not from a password someone types.
const KEY_SALT = "reborn-saved-keys-v1";
const SCRYPT_COST = { N: 2 ** 14, r: 8, p: 1 };

/** The word the saved keys are locked with: SECRETS_KEY when set, else SESSION_SECRET. Empty = nothing can be saved safely. */
export function lockWord(env: NodeJS.ProcessEnv = process.env): string {
  const word = (env.SECRETS_KEY || env.SESSION_SECRET || "").trim();
  return word.length >= 16 ? word : "";
}

const deriveKey = (word: string) => scryptSync(word, KEY_SALT, KEY_BYTES, SCRYPT_COST);

export function encryptValue(plain: string, word: string): string {
  if (!word) throw new Error("no SECRETS_KEY or SESSION_SECRET of 16+ characters is set on the server");
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(word), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${VERSION}:${Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64")}`;
}

/** The plain value, or null when the lock word has changed or the stored text was altered. */
export function decryptValue(stored: string, word: string): string | null {
  if (!word || !stored.startsWith(`${VERSION}:`)) return null;
  try {
    const raw = Buffer.from(stored.slice(VERSION.length + 1), "base64");
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(word), raw.subarray(0, IV_BYTES));
    decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    return Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
