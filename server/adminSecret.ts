// The main-admin password (asked before "Reset all numbers" and the Kings of Singers reset) is kept as a bcrypt hash, never as readable text,
// and is never sent back to the browser. A password saved in the old readable form is accepted once and then turned into a hash.
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "node:crypto";

const BCRYPT_ROUNDS = 12;
export const MIN_MAIN_ADMIN_PASSWORD_LENGTH = 8;
const HASH_FORM = /^\$2[aby]\$\d{2}\$/;

export const isHashedSecret = (value: string): boolean => HASH_FORM.test(value);
export const hashSecret = (plain: string): Promise<string> => bcrypt.hash(plain, BCRYPT_ROUNDS);

function sameText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Whether `given` is the stored main-admin password; `upgrade` is the hash to store when the old readable form matched. */
export async function checkSecret(stored: string, given: string): Promise<{ ok: boolean; upgrade?: string }> {
  if (!stored || !given) return { ok: false };
  if (isHashedSecret(stored)) return { ok: await bcrypt.compare(given, stored) };
  return sameText(stored, given) ? { ok: true, upgrade: await hashSecret(given) } : { ok: false };
}
