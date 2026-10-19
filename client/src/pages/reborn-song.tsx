import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { useToast } from "@/hooks/use-toast";
import { useTranslation, localeTag } from "@/lib/i18n";
import { Search, Music2, Check, Clock, X, Plus, ExternalLink, Mic2, Loader2 } from "lucide-react";

const TABS = ["Songs", "Queue", "My Requests"] as const;
const TAB_KEYS: Record<(typeof TABS)[number], string> = { "Songs": "vn.song.tabSongs", "Queue": "vn.song.tabQueue", "My Requests": "vn.song.tabMine" };

function useDebounced(value: string, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(value.trim()), delay); return () => window.clearTimeout(timer); }, [value, delay]);
  return debounced;
}

type SearchResponse = { songs: any[]; spotifyConnected: boolean; freeCatalogConnected: boolean; boxConnected?: boolean; slow?: boolean };

export default function RebornSong() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Songs");
  const { t: tr } = useTranslation();
  return (
    <RebornLayout active="/songs" title={tr("vn.song.title")}>
      <div className="flex gap-1 p-1 rounded-full bg-white/5 border border-white/10 mb-5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-full text-xs font-semibold transition-colors ${tab === t ? "text-black" : "text-white/60"}`} style={tab === t ? { background: "linear-gradient(90deg,#c9a84c,#f0d787)" } : undefined}>{tr(TAB_KEYS[t])}</button>
        ))}
      </div>
      {tab !== "Queue" && <NowSinging onOpen={() => setTab("Queue")} />}
      {tab === "Songs" && <SongSystem />}
      {tab === "Queue" && <QueueBoard />}
      {tab === "My Requests" && <MyRequests />}
    </RebornLayout>
  );
}

// "400: message" → "message" (the server's translated text).
const errText = (e: any) => String(e?.message || "").replace(/^\d{3}:\s*/, "");
// Table mode: members must scan their table QR before any song request.
function useSongQueueInfo() {
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/song-queue-info"], queryFn: () => apiRequest("GET", "/api/reborn/song-queue-info").then((r) => r.json()), refetchInterval: 15000, refetchOnWindowFocus: true });
  return data;
}
function TableScanNotice({ qi }: { qi: any }) {
  const { t } = useTranslation();
  if (qi?.needTable) return (
    <a href="/kos" className="block mb-4 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3.5">
      <span className="block font-bold text-amber-200">📷 {t("vn.song.needTableTitle")}</span>
      <span className="block text-xs text-white/65 mt-1">{t("vn.song.needTableBody")}</span>
      <span className="inline-block mt-2 px-3 py-1.5 rounded-lg bg-amber-300 text-black text-xs font-bold">{t("vn.kos.scanTableQr")}</span>
    </a>
  );
  if (qi?.mode === "table" && qi?.table) return <p className="mb-3 text-xs font-bold text-emerald-300">✓ {t("vn.kos.checkedInTable", { t: qi.table })}</p>;
  return null;
}

// The live song queue (no staff approval): who's singing now and everyone waiting.
function useSongQueue() {
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/song-queue"], queryFn: () => apiRequest("GET", "/api/reborn/song-queue").then((r) => r.json()), refetchInterval: 8000, refetchOnWindowFocus: true });
  return data;
}
const who = (t: (k: string, v?: any) => string, r: any) => [r.table ? t("vn.song.tableShort", { t: r.table }) : "", r.name || t("vn.song.guest")].filter(Boolean).join(" · ");
function NowSinging({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();
  const q = useSongQueue();
  if (!q?.nowPlaying && !q?.queue?.length) return null;
  const mine = (q.queue || []).find((r: any) => r.mine);
  return (
    <button onClick={onOpen} className="w-full mb-4 text-left rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-3 flex items-center gap-3">
      <Mic2 className="w-5 h-5 text-fuchsia-300 flex-shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-[11px] text-fuchsia-200/80">{q.nowPlaying ? t("vn.song.nowSinging") : t("vn.song.nobodySinging")}{q.paused ? ` · ⏸ ${t("vn.song.paused")}` : ""}</span>
        {q.nowPlaying && <span className="block text-sm font-bold truncate">{who(t, q.nowPlaying)} — {q.nowPlaying.title}</span>}
        <span className="block text-[11px] text-white/55">{mine ? t("vn.song.yourTurnIn", { n: mine.position }) : t("vn.song.waitingN", { n: q.queue?.length || 0 })}</span>
      </span>
      <span className="text-xs font-bold text-amber-300 flex-shrink-0">{t("vn.song.seeQueue")} →</span>
    </button>
  );
}
function QueueBoard() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const q = useSongQueue();
  // Skip / repeat the song you are singing: one tap, no confirmation.
  const act = useMutation({
    mutationFn: (v: { id: number; what: "skip" | "repeat" }) => apiRequest("POST", `/api/reborn/songs/my-requests/${v.id}/${v.what}`, {}).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: (d: any) => { toast({ title: d.message }); qc.invalidateQueries({ queryKey: ["/api/reborn/song-queue"] }); },
    onError: (e: any) => toast({ title: t("vn.common.failed"), description: errText(e), variant: "destructive" }),
  });
  const voice = useMutation({
    mutationFn: (v: { id: number; vocal: "original" | "karaoke" }) => apiRequest("POST", `/api/reborn/songs/my-requests/${v.id}/vocal`, { vocal: v.vocal }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/reborn/song-queue"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/songs/my-requests"] }); },
    onError: (e: any) => toast({ title: t("vn.common.failed"), description: errText(e), variant: "destructive" }),
  });
  const flip = (song: any) => voice.mutate({ id: song.id, vocal: song.vocal === "original" ? "karaoke" : "original" });
  if (!q) return null;
  const list: any[] = q.queue || [];
  // With no app song on, the first song on the system itself is the one being sung; the rest wait under "ordered on the song system".
  const onBoxNow = !q.nowPlaying ? (q.boxQueue || [])[0] : null;
  const onBoxWaiting: any[] = (q.boxQueue || []).slice(onBoxNow ? 1 : 0);
  return (
    <div className="space-y-2">
      <div className="rounded-3xl p-4 border border-fuchsia-400/30" style={{ background: "linear-gradient(135deg,rgba(217,70,239,.18),rgba(201,168,76,.12))" }}>
        <p className="text-[11px] font-bold tracking-wider text-fuchsia-200/80 uppercase">🎤 {t("vn.song.nowSinging")}{q.paused ? ` · ⏸ ${t("vn.song.paused")}` : ""}</p>
        {q.nowPlaying ? (<>
          <p className="text-lg font-black mt-1">{q.nowPlaying.title}</p>
          <p className="text-xs text-white/60">{q.nowPlaying.artist || "—"}</p>
          <p className="mt-2 inline-block px-2.5 py-1 rounded-full bg-black/30 text-xs font-bold text-amber-200">{who(t, q.nowPlaying)}{q.nowPlaying.mine ? ` · ${t("vn.song.you")}` : ""} · {q.nowPlaying.vocal === "original" ? `🎤 ${t("vn.song.vocalOriginal")}` : `🎶 ${t("vn.song.vocalKaraoke")}`}</p>
          {q.nowPlaying.mine && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => flip(q.nowPlaying)} disabled={voice.isPending} aria-pressed={q.nowPlaying.vocal === "original"} className={`col-span-2 rounded-xl px-3 py-2.5 text-sm font-bold ${q.nowPlaying.vocal === "original" ? "bg-amber-400 text-black" : "bg-white/10"}`}>{q.nowPlaying.vocal === "original" ? t("vn.song.voiceOn") : t("vn.song.voiceOff")}</button>
              <button onClick={() => act.mutate({ id: q.nowPlaying.id, what: "repeat" })} disabled={act.isPending} className="rounded-xl bg-white/10 px-3 py-2.5 text-sm font-bold">🔁 {t("vn.song.repeat")}</button>
              <button onClick={() => act.mutate({ id: q.nowPlaying.id, what: "skip" })} disabled={act.isPending} className="rounded-xl bg-red-500/80 px-3 py-2.5 text-sm font-bold text-white">⏭ {t("vn.song.skip")}</button>
            </div>
          )}
        </>) : onBoxNow ? (<>
          <p className="text-lg font-black mt-1">{onBoxNow.title}</p>
          <p className="text-xs text-white/60">{onBoxNow.artist || "—"}</p>
          <p className="mt-2 inline-block px-2.5 py-1 rounded-full bg-black/30 text-xs font-bold text-cyan-200">{t("vn.song.orderedOnSystem")}</p>
        </>) : <p className="text-sm text-white/60 mt-1">{t("vn.song.nobodySinging")}</p>}
      </div>
      <p className="text-xs text-white/50 px-1">{q.mode === "table" ? t("vn.song.fairNoteTable", { n: q.perTurn ?? 1 }) : t("vn.song.fairNoteUser", { n: q.perTurn ?? 1 })}</p>
      {list.length === 0 && <div className="text-center py-8 text-white/40"><Music2 className="w-9 h-9 mx-auto mb-2 opacity-30" /><p className="text-sm">{t("vn.song.queueEmpty")}</p></div>}
      {list.map((r) => (
        <div key={r.id} className={`flex items-center gap-3 p-3 rounded-2xl border ${r.mine ? "border-amber-400/60 bg-amber-400/10" : "border-white/10 bg-white/5"}`}>
          <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black text-black" style={{ background: "linear-gradient(135deg,#c9a84c,#f0d787)" }}>{r.position}</span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold truncate">{r.title}{r.artist ? <span className="text-white/45 font-normal"> · {r.artist}</span> : null}</span>
            <span className="block text-xs text-white/55 truncate">{who(t, r)}{r.mine ? <b className="text-amber-300"> · {t("vn.song.you")}</b> : null} · {r.mine ? <button type="button" onClick={() => flip(r)} disabled={voice.isPending} className="min-h-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-amber-200">{r.vocal === "original" ? t("vn.song.voiceOn") : t("vn.song.voiceOff")}</button> : (r.vocal === "original" ? `🎤 ${t("vn.song.vocalOriginal")}` : `🎶 ${t("vn.song.vocalKaraoke")}`)}</span>
          </span>
          {r.position === 1 && <span className="text-[10px] font-bold text-emerald-300 flex-shrink-0">{t("vn.song.upNext")}</span>}
        </div>
      ))}
      {onBoxWaiting.length > 0 && (
        <div className="pt-2">
          <p className="px-1 pb-1 text-xs font-bold text-white/50">{t("vn.song.onSystem")}</p>
          {onBoxWaiting.map((x, i) => (
            <div key={`${x.title}-${i}`} className="mb-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <Music2 className="h-5 w-5 flex-shrink-0 text-cyan-300" />
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{x.title}{x.artist ? <span className="font-normal text-white/45"> · {x.artist}</span> : null}</span><span className="block text-xs text-white/50">{t("vn.song.orderedOnSystem")}</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SongRow({ s, onRequest, pending }: any) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
      {s.photo ? <img src={`/api/reborn/karaoke/photo/${s.photo}`} alt="" loading="lazy" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
        : s.artistPhoto ? <img src={s.artistPhoto} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
        : <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,168,76,0.15)" }}><Music2 className="w-5 h-5 text-amber-300" /></span>}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate flex items-center gap-1">{s.source === "karaoke" && <span className="text-[10px] font-bold text-emerald-300" title={t("vn.song.inBox")}>🎤</span>}{s.title}{s.isHit && <span className="text-[10px] font-bold text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded">{t("vn.song.hit")}</span>}</p>
        <p className="text-xs text-white/50 truncate">{s.artist || t("vn.song.singerOptional")}{s.spotifyUrl && <a href={s.spotifyUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-0.5 text-emerald-400"><ExternalLink className="w-3 h-3" /> Spotify</a>}{!s.spotifyUrl && s.catalogUrl && <a href={s.catalogUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-0.5 text-cyan-300"><ExternalLink className="w-3 h-3" /> {s.source === "apple" ? "Apple" : "MusicBrainz"}</a>}</p>
      </div>
      <button onClick={() => onRequest(s)} disabled={pending} className="px-3 py-1.5 rounded-full text-xs font-bold text-black flex-shrink-0" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>{t("vn.song.request")}</button>
    </div>
  );
}

// The song system as members see it: search it, or browse its singers (photo + name, most songs first) and pick a song to request.
// Only songs the karaoke system has are offered, so what is ordered is what plays.
function SongSystem() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const search = useDebounced(q);
  const [singer, setSinger] = useState<any>(null);
  const [singerPage, setSingerPage] = useState(1);
  const [songPage, setSongPage] = useState(1);
  const [vocal, setVocal] = useState<"karaoke" | "original">("karaoke"); // the singer's own voice off (karaoke) or on (original / analog)
  const { data: status } = useQuery<{ online: boolean }>({ queryKey: ["/api/reborn/karaoke/status"], queryFn: () => apiRequest("GET", "/api/reborn/karaoke/status").then((r) => r.json()), refetchInterval: 15000 });
  const { data: found, isFetching: isSearching } = useQuery<SearchResponse>({
    queryKey: ["/api/reborn/songs/search", search],
    queryFn: () => apiRequest("GET", `/api/reborn/songs/search?q=${encodeURIComponent(search)}`).then((r) => r.json()),
    enabled: search.length > 0 && status?.online !== false,
  });
  // Singers: pages are added under each other ("Show more"); each page is one question to the song system.
  const [singerRows, setSingerRows] = useState<any[]>([]);
  const { data: singerAnswer, isFetching: isLoadingSingers } = useQuery<any>({
    queryKey: ["/api/reborn/karaoke/singers", singerPage],
    queryFn: () => apiRequest("GET", `/api/reborn/karaoke/singers?page=${singerPage}`).then((r) => r.json()),
    enabled: status?.online !== false && !search && !singer,
  });
  useEffect(() => { if (singerAnswer?.singers) setSingerRows((rows) => (singerPage === 1 ? singerAnswer.singers : [...rows, ...singerAnswer.singers.filter((x: any) => !rows.some((r) => r.name === x.name))])); }, [singerAnswer, singerPage]);
  const [singerSongs, setSingerSongs] = useState<any[]>([]);
  const { data: songsAnswer, isFetching: isLoadingSongs } = useQuery<any>({
    queryKey: ["/api/reborn/karaoke/singer-songs", singer?.name, songPage],
    queryFn: () => apiRequest("GET", `/api/reborn/karaoke/singer-songs?name=${encodeURIComponent(singer.name)}&page=${songPage}`).then((r) => r.json()),
    enabled: !!singer && status?.online !== false,
  });
  useEffect(() => { if (songsAnswer?.songs) setSingerSongs((rows) => (songPage === 1 ? songsAnswer.songs : [...rows, ...songsAnswer.songs.filter((x: any) => !rows.some((r) => r.code === x.code))])); }, [songsAnswer, songPage]);
  const openSinger = (x: any) => { setSinger(x); setSongPage(1); setSingerSongs([]); };
  const req = useMutation({
    // A song picked from the song system is ordered by its number there, so the right song plays.
    mutationFn: (song: any) => apiRequest("POST", "/api/reborn/songs/request", { title: song.title, artist: song.artist, karaokeCode: song.karaokeCode || song.code, performanceMode: "self", vocal }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: t("vn.song.requested"), description: d.message }); qc.invalidateQueries({ queryKey: ["/api/reborn/songs/my-requests"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/song-queue"] }); },
    onError: (e: any) => { qc.invalidateQueries({ queryKey: ["/api/reborn/song-queue-info"] }); toast({ title: t("vn.common.failed"), description: errText(e), variant: "destructive" }); },
  });
  const qi = useSongQueueInfo();
  const ask = (x: any) => (qi?.needTable ? toast({ title: t("vn.song.needTableTitle"), description: t("vn.song.needTableBody"), variant: "destructive" }) : req.mutate(x));
  const rowOf = (x: any) => <SongRow key={x.code || x.karaokeCode} s={{ ...x, source: "karaoke", karaokeCode: x.karaokeCode || x.code }} onRequest={ask} pending={req.isPending} />;

  if (status && !status.online) return (
    <div className="text-center py-12 text-white/50">
      <Music2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-semibold text-white/70">{t("vn.song.offlineTitle")}</p>
      <p className="mt-1 text-sm">{t("vn.song.offlineBody")}</p>
    </div>
  );
  return (
    <div>
      <TableScanNotice qi={qi} />
      <button type="button" onClick={() => setVocal(vocal === "original" ? "karaoke" : "original")} aria-pressed={vocal === "original"} className={`mb-3 w-full rounded-2xl border px-3 py-3 text-sm font-bold ${vocal === "original" ? "border-amber-300 bg-amber-400 text-black" : "border-white/10 bg-white/5 text-white/70"}`}>{vocal === "original" ? t("vn.song.voiceOn") : t("vn.song.voiceOff")}</button>
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setSinger(null); }} placeholder={t("vn.song.searchSystemPh")} className="w-full pl-9 pr-4 py-3 rounded-full bg-black/30 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60" />
      </div>
      {search ? (
        <>
          <p className="mb-3 flex items-center gap-2 text-xs text-white/40">{isSearching && <Loader2 className="w-4 h-4 animate-spin text-amber-300" />}{isSearching ? t("vn.song.searchingAll") : t("vn.song.resultsBox")}</p>
          {isSearching && !(found?.songs || []).length && <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-amber-300" /></div>}
          {!isSearching && !(found?.songs || []).length && <div className="text-center py-10 text-white/40"><Music2 className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>{found?.slow ? t("vn.song.searchSlow") : t("vn.song.noSongsSystem")}</p></div>}
          <div className="space-y-2">{(found?.songs || []).map(rowOf)}</div>
        </>
      ) : singer ? (
        <>
          <button onClick={() => setSinger(null)} className="mb-3 inline-flex items-center gap-1 text-sm text-white/60">← {t("vn.song.backToSingers")}</button>
          <div className="mb-3 flex items-center gap-3">
            {singer.photo ? <img src={`/api/reborn/karaoke/photo/${singer.photo}`} alt="" className="h-16 w-16 rounded-2xl object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/15"><Mic2 className="h-7 w-7 text-amber-300" /></span>}
            <div><p className="text-xl font-extrabold">{singer.name}</p><p className="text-xs text-white/50">{t("vn.song.songsN", { n: String(singer.songs ?? "") })}</p></div>
          </div>
          <div className="space-y-2">{singerSongs.map(rowOf)}</div>
          {isLoadingSongs && <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-amber-300" /></div>}
          {songsAnswer && songPage < songsAnswer.maxPage && <button onClick={() => setSongPage((n) => n + 1)} className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white/80">{t("vn.song.showMoreSongs")}</button>}
        </>
      ) : (
        <>
          <p className="mb-3 text-xs text-white/40">{t("vn.song.singersHint")}</p>
          {singerAnswer?.loading && <p className="mb-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100">{t("vn.song.loadingList")}</p>}
          <div className="grid grid-cols-3 gap-2.5">
            {singerRows.map((x) => (
              <button key={x.name} onClick={() => openSinger(x)} className="min-h-0 p-0 text-left">
                <span className="block overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  {x.photo ? <img src={`/api/reborn/karaoke/photo/${x.photo}`} alt="" loading="lazy" className="aspect-square w-full object-cover" /> : <span className="flex aspect-square w-full items-center justify-center bg-amber-400/10"><Mic2 className="h-8 w-8 text-amber-300/70" /></span>}
                  <span className="block px-2 py-1.5"><span className="block truncate text-[13px] font-semibold leading-tight">{x.name}</span><span className="block truncate text-[10px] text-white/40">{t("vn.song.songsN", { n: String(x.songs) })}</span></span>
                </span>
              </button>
            ))}
          </div>
          {isLoadingSingers && <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-amber-300" /></div>}
          {singerAnswer && singerPage < singerAnswer.maxPage && <button onClick={() => setSingerPage((n) => n + 1)} className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white/80">{t("vn.song.showMoreSingers")}</button>}
        </>
      )}
    </div>
  );
}

function MyRequests() {
  const { t, language } = useTranslation();
  const { data: qi } = useQuery<any>({ queryKey: ["/api/reborn/song-queue-info"], queryFn: () => apiRequest("GET", "/api/reborn/song-queue-info").then((r) => r.json()) });
  const { data: venue } = useQuery<any>({ queryKey: ["/api/reborn/venue/status"], queryFn: () => apiRequest("GET", "/api/reborn/venue/status").then((r) => r.json()) });
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/songs/my-requests"], queryFn: () => apiRequest("GET", "/api/reborn/songs/my-requests").then((r) => r.json()), refetchInterval: 10000, refetchOnWindowFocus: true });
  const qc = useQueryClient();
  const { toast } = useToast();
  const cancel = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/reborn/songs/my-requests/${id}/cancel`, {}).then((r) => r.json()),
    onSuccess: (d: any) => { toast({ title: d.message }); qc.invalidateQueries({ queryKey: ["/api/reborn/songs/my-requests"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/song-queue"] }); },
    onError: (e: any) => toast({ title: t("vn.common.failed"), description: errText(e), variant: "destructive" }),
  });
  if (rows.length === 0) return <div className="text-center py-12 text-white/40"><Music2 className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>{t("vn.song.noRequests")}</p></div>;
  return (
    <div className="space-y-2">
      {rows.some((r) => r.status === "pending") && <p className="text-xs text-white/50 px-1">{qi?.mode === "table" ? t("vn.song.fairNoteTable", { n: qi?.perTurn ?? 1 }) : t("vn.song.fairNoteUser", { n: qi?.perTurn ?? 1 })}{venue?.table ? ` ${t("vn.song.yourTable", { t: venue.table })}` : ""}</p>}
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex-1 min-w-0"><p className="font-semibold truncate">{r.title}</p><p className="text-xs text-white/50 truncate">{r.artist || "—"} · {r.vocal === "original" ? t("vn.song.voiceOn") : t("vn.song.voiceOff")} · {new Date(r.createdAt).toLocaleDateString(localeTag(language))}</p></div>
          {r.status === "playing" ? <span className="inline-flex items-center gap-1 text-xs font-bold text-fuchsia-300"><Mic2 className="w-4 h-4" /> {t("vn.song.onNow")}</span>
            : r.status === "confirmed" ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400"><Check className="w-4 h-4" /> {t("vn.song.sung")}</span>
            : r.status === "skipped" ? <span className="inline-flex items-center gap-1 text-xs font-bold text-white/50">⏭ {t("vn.song.skipped")}</span>
            : r.status === "rejected" || r.status === "cancelled" ? <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400"><X className="w-4 h-4" /> {t("vn.song.cancelled")}</span>
            : <span className="inline-flex flex-col items-end gap-1 text-xs font-bold text-amber-300"><span className="inline-flex items-center gap-1"><Clock className="w-4 h-4" /> {r.position ? t("vn.song.queuePos", { n: r.position }) : t("vn.song.waiting")}</span><button onClick={() => { if (confirm(t("vn.song.cancelConfirm"))) cancel.mutate(r.id); }} className="text-[11px] font-semibold text-white/50 underline">{t("vn.song.cancel")}</button></span>}
        </div>
      ))}
    </div>
  );
}
