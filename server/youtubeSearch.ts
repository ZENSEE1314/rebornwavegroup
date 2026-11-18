// YouTube karaoke videos as a song source for the box's built-in player. Members search the songs; with a YouTube Data API key on the server
// (YOUTUBE_API_KEY) the search also returns karaoke videos that may be embedded. A request carries the video as the song number "yt:<video id>"
// and the player shows it with YouTube's own embedded player (never downloaded).

export const YOUTUBE_CODE_PREFIX = "yt:";

const SEARCH_ADDRESS = "https://www.googleapis.com/youtube/v3/search";
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 80;
const RESULTS_PER_SEARCH = 8;
const CACHE_MS = 24 * 60 * 60 * 1000; // the free quota is 100 searches a day, so a repeated search is answered from memory
const MAX_CACHED_SEARCHES = 500;
const REQUEST_TIMEOUT_MS = 6_000;
const KARAOKE_WORDS = /karaoke|卡拉ok|伴奏|instrumental|ktv/i;
const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'", "&apos;": "'" };

export interface YoutubeSong {
  source: "karaoke";
  title: string;
  titlePinyin: string;
  artist: string;
  artistPinyin: string;
  karaokeCode: string;
  photo: string;
}

type Fetch = (address: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

const cache = new Map<string, { at: number; songs: YoutubeSong[] }>();

export const isYoutubeCode = (code: string): boolean => code.startsWith(YOUTUBE_CODE_PREFIX) && VIDEO_ID.test(code.slice(YOUTUBE_CODE_PREFIX.length));

/** What is typed, plus "karaoke" so the search finds the version with no singer on it. */
export function karaokeQuery(typed: string): string {
  const text = typed.trim().slice(0, MAX_QUERY_LENGTH);
  return KARAOKE_WORDS.test(text) ? text : `${text} karaoke`;
}

/** The API sends titles with HTML entities in them ("Rock &amp; Roll"). */
export function decodeEntities(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|apos|#39);/g, (entity) => ENTITIES[entity] ?? entity);
}

/** The videos of an answer of the search API, as songs the app can list and request. */
export function songsFromAnswer(answer: unknown): YoutubeSong[] {
  const items = (answer as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  const songs: YoutubeSong[] = [];
  for (const item of items) {
    const id = String(item?.id?.videoId ?? "");
    const title = decodeEntities(String(item?.snippet?.title ?? "")).trim();
    if (!VIDEO_ID.test(id) || !title) continue;
    const channel = decodeEntities(String(item?.snippet?.channelTitle ?? "")).trim();
    songs.push({ source: "karaoke", title, titlePinyin: "", artist: `▶ YouTube${channel ? ` · ${channel}` : ""}`, artistPinyin: "", karaokeCode: YOUTUBE_CODE_PREFIX + id, photo: "" });
  }
  return songs;
}

/** Karaoke videos for what a member typed; an empty list when there is no key, the text is too short or YouTube does not answer. */
export async function searchYoutubeKaraoke(typed: string, fetchImpl: Fetch = fetch as unknown as Fetch, now = Date.now()): Promise<YoutubeSong[]> {
  const key = process.env.YOUTUBE_API_KEY || "";
  const query = karaokeQuery(typed);
  if (!key || typed.trim().length < MIN_QUERY_LENGTH) return [];
  const cached = cache.get(query.toLowerCase());
  if (cached && now - cached.at < CACHE_MS) return cached.songs;
  const params = new URLSearchParams({ part: "snippet", type: "video", videoEmbeddable: "true", maxResults: String(RESULTS_PER_SEARCH), q: query, key });
  try {
    const res = await fetchImpl(`${SEARCH_ADDRESS}?${params}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!res.ok) return [];
    const songs = songsFromAnswer(await res.json());
    if (cache.size >= MAX_CACHED_SEARCHES) cache.delete(cache.keys().next().value!);
    cache.set(query.toLowerCase(), { at: now, songs });
    return songs;
  } catch {
    return [];
  }
}

export function clearYoutubeCache(): void {
  cache.clear();
}
