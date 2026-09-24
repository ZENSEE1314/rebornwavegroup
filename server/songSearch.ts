import { desc, ilike, or } from "drizzle-orm";
import { pinyin } from "pinyin-pro";
import { db } from "./db";
import { songs } from "@shared/schema";

export type SongSuggestion = {
  id?: number;
  source: "library" | "spotify" | "musicbrainz" | "apple";
  externalId?: string;
  title: string;
  titlePinyin: string;
  artist: string;
  artistPinyin: string;
  spotifyUrl?: string | null;
  catalogUrl?: string | null;
  artistPhoto?: string | null;
  isHit?: boolean | null;
  requestCount?: number | null;
};

let spotifyToken = "";
let spotifyTokenExpiresAt = 0;
const musicBrainzCache = new Map<string, { expiresAt: number; rows: SongSuggestion[] }>();
const musicBrainzInflight = new Map<string, Promise<SongSuggestion[]>>();
const appleSearchCache = new Map<string, { expiresAt: number; rows: SongSuggestion[] }>();
let musicBrainzLastRequestAt = 0;
let musicBrainzQueue: Promise<unknown> = Promise.resolve();

export function textPinyin(value: unknown): string {
  const text = String(value || "").trim();
  if (!/[\u3400-\u9fff]/.test(text)) return "";
  return pinyin(text, { toneType: "none", type: "array" }).join(" ");
}

export function spotifySearchConfigured(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

async function getSpotifyToken(): Promise<string> {
  if (!spotifySearchConfigured()) return "";
  if (spotifyToken && Date.now() < spotifyTokenExpiresAt) return spotifyToken;
  const auth = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Spotify token failed (${response.status})`);
  const body = await response.json() as { access_token?: string; expires_in?: number };
  spotifyToken = body.access_token || "";
  spotifyTokenExpiresAt = Date.now() + Math.max(60, Number(body.expires_in || 3600) - 60) * 1000;
  return spotifyToken;
}

async function searchSpotify(query: string, limit: number): Promise<SongSuggestion[]> {
  const token = await getSpotifyToken();
  if (!token) return [];
  const params = new URLSearchParams({ q: query, type: "track", limit: String(Math.min(10, limit)), market: process.env.SPOTIFY_MARKET || "ID" });
  const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Spotify search failed (${response.status})`);
  const body = await response.json() as any;
  return (body?.tracks?.items || []).map((track: any) => {
    const title = String(track?.name || "").trim();
    const artist = (track?.artists || []).map((a: any) => a?.name).filter(Boolean).join(", ");
    return {
      source: "spotify" as const,
      externalId: track?.id,
      title,
      titlePinyin: textPinyin(title),
      artist,
      artistPinyin: textPinyin(artist),
      spotifyUrl: track?.external_urls?.spotify || null,
      artistPhoto: null,
    };
  }).filter((row: SongSuggestion) => row.title);
}

function musicBrainzArtist(credits: any[]): string {
  return (credits || []).map((credit) => `${credit?.name || credit?.artist?.name || ""}${credit?.joinphrase || ""}`).join("").trim();
}

async function musicBrainzRequest(query: string, limit: number): Promise<SongSuggestion[]> {
  const waitMs = Math.max(0, 1_100 - (Date.now() - musicBrainzLastRequestAt));
  if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
  const params = new URLSearchParams({ query, fmt: "json", limit: String(Math.min(10, limit)) });
  try {
    const response = await fetch(`https://musicbrainz.org/ws/2/recording/?${params}`, {
      headers: { "User-Agent": process.env.MUSICBRAINZ_USER_AGENT || "BridgeXPOS/1.0 (https://rebornwave.group)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`MusicBrainz search failed (${response.status})`);
    const body = await response.json() as any;
    return (body?.recordings || []).map((recording: any) => {
      const title = String(recording?.title || "").trim();
      const artist = musicBrainzArtist(recording?.["artist-credit"] || []);
      return {
        source: "musicbrainz" as const,
        externalId: recording?.id,
        title,
        titlePinyin: textPinyin(title),
        artist,
        artistPinyin: textPinyin(artist),
        catalogUrl: recording?.id ? `https://musicbrainz.org/recording/${recording.id}` : null,
      };
    }).filter((row: SongSuggestion) => row.title);
  } finally {
    musicBrainzLastRequestAt = Date.now();
  }
}

async function searchMusicBrainz(query: string, limit: number): Promise<SongSuggestion[]> {
  const key = `${query.toLocaleLowerCase()}|${limit}`;
  const cached = musicBrainzCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.rows;
  const current = musicBrainzInflight.get(key);
  if (current) return current;
  const request = musicBrainzQueue.then(() => musicBrainzRequest(query, limit)) as Promise<SongSuggestion[]>;
  musicBrainzQueue = request.then(() => undefined, () => undefined);
  musicBrainzInflight.set(key, request);
  try {
    const rows = await request;
    musicBrainzCache.set(key, { expiresAt: Date.now() + 60 * 60 * 1000, rows });
    if (musicBrainzCache.size > 500) musicBrainzCache.delete(musicBrainzCache.keys().next().value!);
    return rows;
  } finally {
    musicBrainzInflight.delete(key);
  }
}

function normalizedSearchText(value: string): string {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9\u3400-\u9fff]+/g, "");
}

async function searchAppleCatalog(query: string, limit: number): Promise<SongSuggestion[]> {
  const key = `${query.toLocaleLowerCase()}|${limit}`;
  const cached = appleSearchCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.rows;
  const params = new URLSearchParams({ term: query, country: "US", media: "music", entity: "song", limit: String(Math.min(50, Math.max(20, limit * 3))) });
  const response = await fetch(`https://itunes.apple.com/search?${params}`, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Apple catalog search failed (${response.status})`);
  const body = await response.json() as any;
  const queryKey = normalizedSearchText(query);
  const rows: SongSuggestion[] = (body?.results || []).map((track: any) => {
    const title = String(track?.trackName || "").trim();
    const artist = String(track?.artistName || "").trim();
    return {
      source: "apple" as const,
      externalId: String(track?.trackId || ""),
      title,
      titlePinyin: textPinyin(title),
      artist,
      artistPinyin: textPinyin(artist),
      catalogUrl: track?.trackViewUrl || null,
      _score: (/[\u3400-\u9fff]/.test(title) ? 100 : 0) + (normalizedSearchText(title).includes(queryKey) ? 80 : 0) + (/[\u3400-\u9fff]/.test(artist) ? 20 : 0),
    } as SongSuggestion & { _score: number };
  }).filter((row: SongSuggestion) => row.title).sort((a: any, b: any) => b._score - a._score).slice(0, limit).map(({ _score, ...row }: any) => row);
  appleSearchCache.set(key, { expiresAt: Date.now() + 60 * 60 * 1000, rows });
  if (appleSearchCache.size > 500) appleSearchCache.delete(appleSearchCache.keys().next().value!);
  return rows;
}

export async function searchSongCatalog(rawQuery: unknown, limit = 10): Promise<{ songs: SongSuggestion[]; spotifyConnected: boolean; freeCatalogConnected: boolean }> {
  const query = String(rawQuery || "").trim().slice(0, 120);
  if (!query) return { songs: [], spotifyConnected: spotifySearchConfigured(), freeCatalogConnected: true };
  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const local = await db.select().from(songs).where(or(
    ilike(songs.title, pattern),
    ilike(songs.titlePinyin, pattern),
    ilike(songs.artist, pattern),
    ilike(songs.artistPinyin, pattern),
  )).orderBy(desc(songs.isHit), desc(songs.requestCount)).limit(limit);

  let remote: SongSuggestion[] = [];
  if (spotifySearchConfigured()) {
    try { remote = await searchSpotify(query, limit); }
    catch (error) { console.error("[spotify] search", error); }
  }
  let freeCatalog: SongSuggestion[] = [];
  try { freeCatalog = await searchMusicBrainz(query, limit); }
  catch (error) { console.error("[musicbrainz] search", error); }
  let appleCatalog: SongSuggestion[] = [];
  try { appleCatalog = await searchAppleCatalog(query, limit); }
  catch (error) { console.error("[apple] search", error); }
  const combined: SongSuggestion[] = [
    ...remote,
    ...appleCatalog,
    ...freeCatalog,
    ...local.map((row): SongSuggestion => ({
      id: row.id,
      source: "library",
      title: row.title,
      titlePinyin: row.titlePinyin || "",
      artist: row.artist || "",
      artistPinyin: row.artistPinyin || "",
      spotifyUrl: row.spotifyUrl,
      artistPhoto: row.artistPhoto,
      isHit: row.isHit,
      requestCount: row.requestCount,
    })),
  ];
  const seen = new Set<string>();
  const deduped = combined.filter((row) => {
    const key = `${row.title.toLocaleLowerCase()}|${row.artist.toLocaleLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
  return { songs: deduped, spotifyConnected: spotifySearchConfigured(), freeCatalogConnected: true };
}
