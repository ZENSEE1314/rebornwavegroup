// The file format of an encrypted backup (.rbk): "RBK1" + salt(16) + iv(12) + AES-256-GCM(gzip(JSON lines)) + tag(16).
// The key comes from a passphrase (scrypt), so a stolen backup file is only noise without it. Plain Node, no packages.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { createGzip, createGunzip } from "node:zlib";
import { Transform } from "node:stream";

export const MAGIC = Buffer.from("RBK1");
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;
export const HEADER_BYTES = MAGIC.length + SALT_BYTES + IV_BYTES;
export const MIN_PASSPHRASE_LENGTH = 16;
// scrypt cost: about 100 ms on a PC, slow enough to make guessing a passphrase expensive.
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };

const deriveKey = (passphrase, salt) => scryptSync(passphrase, salt, KEY_BYTES, SCRYPT);

/** A stream that gzips and encrypts whatever is written to it; the first bytes it gives out are the header, the last are the tag. */
export function createEncryptStream(passphrase) {
  if (String(passphrase || "").length < MIN_PASSPHRASE_LENGTH) throw new Error(`the backup passphrase needs at least ${MIN_PASSPHRASE_LENGTH} characters`);
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(passphrase, salt), iv);
  const gzip = createGzip({ level: 6 });
  let headerSent = false;
  const encrypt = new Transform({
    transform(chunk, _enc, done) {
      if (!headerSent) { this.push(Buffer.concat([MAGIC, salt, iv])); headerSent = true; }
      this.push(cipher.update(chunk));
      done();
    },
    flush(done) {
      if (!headerSent) this.push(Buffer.concat([MAGIC, salt, iv]));
      this.push(cipher.final());
      this.push(cipher.getAuthTag());
      done();
    },
  });
  gzip.pipe(encrypt);
  // Writing goes to gzip, reading comes from encrypt.
  return { input: gzip, output: encrypt };
}

/** Reads a whole backup file's bytes and gives back a stream of the decrypted, gunzipped text. Throws when the passphrase is wrong or the file was changed. */
export function decryptBuffer(buffer, passphrase) {
  if (buffer.length < HEADER_BYTES + TAG_BYTES || !buffer.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("this is not a Reborn backup file");
  const salt = buffer.subarray(MAGIC.length, MAGIC.length + SALT_BYTES);
  const iv = buffer.subarray(MAGIC.length + SALT_BYTES, HEADER_BYTES);
  const tag = buffer.subarray(buffer.length - TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(passphrase, salt), iv);
  decipher.setAuthTag(tag);
  let plain;
  try { plain = Buffer.concat([decipher.update(buffer.subarray(HEADER_BYTES, buffer.length - TAG_BYTES)), decipher.final()]); }
  catch { throw new Error("wrong passphrase, or the backup file is damaged or was changed"); }
  return plain; // gzip bytes
}

export { createGunzip };
