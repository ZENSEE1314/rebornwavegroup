// Pure rules for the TV screens (no database, no web server): cleaning the admin's setup, which TV follows which
// table, and what the moving "next song" bar says. Kept apart so it can be tested on its own.

export const TV_VIEWS = ["overlay", "queue", "gifts", "off"] as const;
export type TvView = (typeof TV_VIEWS)[number];

export interface TvScreen {
  id: string;
  name: string;
  /** Secret part of the TV's address; whoever has the address can open that TV's page. */
  token: string;
  view: TvView;
  /** Tables this TV follows. Empty = every table. */
  tables: string[];
}

export interface TvSetup { screens: TvScreen[] }

export interface GiftEvent {
  id: string;
  giftName: string;
  emoji: string;
  imageUrl: string;
  animation: string;
  fromName: string;
  fromTable: string;
  toName: string;
  toTable: string;
  kgold: number;
  fromPhoto?: string;
  toPhoto?: string;
  /** The receiver's three biggest gifters tonight, for the "top 3" card on the TV. */
  topGifters?: Array<{ name: string; photo: string; sent: number }>;
}

const MAX_PHOTO_CHARS = 60_000;

/** A member's picture for a TV: a web address, or a small uploaded one; a huge one is left out (the TV shows the initial). */
export function tvPhoto(url: unknown): string {
  return typeof url === "string" && url.length <= MAX_PHOTO_CHARS ? url : "";
}

export interface SongLine { title: string; artist: string; table: string; name: string }

export const MAX_TV_SCREENS = 12;
export const MAX_NEXT_SONGS = 12;
const MAX_NAME_LENGTH = 40;
const MAX_TABLES = 60;
const MAX_TABLE_LENGTH = 20;
const TOKEN_FORMAT = /^[a-f0-9]{24}$/;
const ID_FORMAT = /^[a-z0-9-]{1,40}$/;

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** "Table 5", "table5", "5" and "meja 5" all mean table 5. */
export function tableKey(label: string | null | undefined): string {
  return String(label ?? "").toLowerCase().replace(/^(table|meja|桌)\s*/, "").replace(/\s*桌$/, "").replace(/\s+/g, "").trim();
}

function parseTables(raw: unknown): string[] {
  const parts = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[,;\n]+/) : [];
  const seen = new Set<string>();
  const tables: string[] = [];
  for (const part of parts) {
    const label = text(part, MAX_TABLE_LENGTH);
    const key = tableKey(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    tables.push(label);
    if (tables.length >= MAX_TABLES) break;
  }
  return tables;
}

/** Turns whatever the admin screen sent (or what was stored) into a safe setup: valid views, unique ids and tokens. */
export function cleanSetup(raw: unknown, makeId: () => string, makeToken: () => string): TvSetup {
  const incoming = raw && typeof raw === "object" && Array.isArray((raw as { screens?: unknown }).screens) ? (raw as { screens: unknown[] }).screens : [];
  const ids = new Set<string>();
  const tokens = new Set<string>();
  const screens: TvScreen[] = [];
  for (const item of incoming.slice(0, MAX_TV_SCREENS)) {
    const source = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    let id = typeof source.id === "string" && ID_FORMAT.test(source.id) ? source.id : makeId();
    while (ids.has(id)) id = makeId();
    let token = typeof source.token === "string" && TOKEN_FORMAT.test(source.token) ? source.token : makeToken();
    while (tokens.has(token)) token = makeToken();
    ids.add(id);
    tokens.add(token);
    screens.push({
      id,
      token,
      name: text(source.name, MAX_NAME_LENGTH) || `TV ${screens.length + 1}`,
      view: TV_VIEWS.includes(source.view as TvView) ? (source.view as TvView) : "overlay",
      tables: parseTables(source.tables),
    });
  }
  return { screens };
}

/** Does this TV follow at least one of these tables? A TV with no tables chosen follows all of them. */
export function screenCovers(screen: Pick<TvScreen, "tables">, tables: Array<string | null | undefined>): boolean {
  if (!screen.tables.length) return true;
  const wanted = new Set(screen.tables.map(tableKey));
  return tables.some((table) => !!table && wanted.has(tableKey(table)));
}

/** The song on now and the songs waiting, limited to the tables this TV follows. */
export function songLinesFor(
  board: { nowPlaying?: Partial<SongLine> | null; queue?: Array<Partial<SongLine>> },
  screen: Pick<TvScreen, "tables">,
): { now: SongLine | null; next: SongLine[] } {
  const line = (song: Partial<SongLine>): SongLine => ({ title: String(song.title ?? ""), artist: String(song.artist ?? ""), table: String(song.table ?? ""), name: String(song.name ?? "") });
  const follows = (song: Partial<SongLine>) => screenCovers(screen, [song.table]);
  const now = board.nowPlaying && follows(board.nowPlaying) ? line(board.nowPlaying) : null;
  const next = (board.queue ?? []).filter(follows).slice(0, MAX_NEXT_SONGS).map(line);
  return { now, next };
}
