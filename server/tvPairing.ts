// Linking a TV the way a streaming app does: the TV opens a short address and shows a code, and the admin types that code
// next to one of the TV screens in the app. The TV then moves to its own page by itself (no long address to type on a remote).
// Codes live in memory only and expire; a code is useless once used or expired.
const CODE_LENGTH = 6;
const CODE_TTL_MS = 15 * 60_000;
const MAX_OPEN_CODES = 500;

export interface TvLink { path: string }
interface Entry { createdAt: number; link: TvLink | null }

export class TvPairings {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly randomDigit: () => number = () => Math.floor(Math.random() * 10)) {}

  private purge(now: number) {
    for (const [code, entry] of Array.from(this.entries)) if (now - entry.createdAt > CODE_TTL_MS) this.entries.delete(code);
  }

  /** A new code for a TV that is waiting; null when too many are open at once. */
  create(now = Date.now()): string | null {
    this.purge(now);
    if (this.entries.size >= MAX_OPEN_CODES) return null;
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = Array.from({ length: CODE_LENGTH }, () => this.randomDigit()).join("");
      if (!this.entries.has(code)) { this.entries.set(code, { createdAt: now, link: null }); return code; }
    }
    return null;
  }

  /** The admin linked the code to a TV screen. False when the code is unknown, expired or already used. */
  assign(code: string, link: TvLink, now = Date.now()): boolean {
    this.purge(now);
    const entry = this.entries.get(code);
    if (!entry || entry.link) return false;
    entry.link = link;
    return true;
  }

  /** What the waiting TV asks: still waiting, linked (once, then the code is used up), or gone. */
  poll(code: string, now = Date.now()): { status: "waiting" } | { status: "linked"; link: TvLink } | { status: "expired" } {
    this.purge(now);
    const entry = this.entries.get(code);
    if (!entry) return { status: "expired" };
    if (!entry.link) return { status: "waiting" };
    this.entries.delete(code);
    return { status: "linked", link: entry.link };
  }
}

export const isTvCode = (value: unknown): value is string => typeof value === "string" && new RegExp(`^[0-9]{${CODE_LENGTH}}$`).test(value);
export { CODE_LENGTH as TV_CODE_LENGTH, CODE_TTL_MS as TV_CODE_TTL_MS };
