import { desc, ilike, or } from "drizzle-orm";
import { pinyin } from "pinyin-pro";
import { db } from "./db";
import { songs } from "@shared/schema";

export type SongSuggestion = {
  id?: number;
  source: "library" | "spotify";
  externalId?: string;
  title: string;
  titlePinyin: string;
  artist: string;
  artistPinyin: string;
  spotifyUrl?: string | null;
  artistPhoto?: string | null;
  isHit?: boolean | null;
  requestCount?: number | null;
};

let spotifyToken = "";
let spotifyTokenExpiresAt = 0;

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

export async function searchSongCatalog(rawQuery: unknown, limit = 10): Promise<{ songs: SongSuggestion[]; spotifyConnected: boolean }> {
  const query = String(rawQuery || "").trim().slice(0, 120);
  if (!query) return { songs: [], spotifyConnected: spotifySearchConfigured() };
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
  const combined: SongSuggestion[] = [
    ...remote,
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
  return { songs: deduped, spotifyConnected: spotifySearchConfigured() };
}
