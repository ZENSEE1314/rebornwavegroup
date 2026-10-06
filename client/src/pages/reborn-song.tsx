import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { useToast } from "@/hooks/use-toast";
import { useTranslation, localeTag } from "@/lib/i18n";
import { Search, Music2, Check, Clock, X, Plus, ExternalLink, Mic2 } from "lucide-react";

const TABS = ["Top 500", "Request", "Queue", "My Requests"] as const;
const TAB_KEYS: Record<(typeof TABS)[number], string> = { "Top 500": "vn.song.tabTop", "Request": "vn.song.tabRequest", "Queue": "vn.song.tabQueue", "My Requests": "vn.song.tabMine" };

function useDebounced(value: string, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(value.trim()), delay); return () => window.clearTimeout(timer); }, [value, delay]);
  return debounced;
}

type SearchResponse = { songs: any[]; spotifyConnected: boolean; freeCatalogConnected: boolean };

function ModePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  return <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">{[["self",t("vn.song.selfSing")],["singer",t("vn.song.bySinger")]].map(([id,label])=><button key={id} type="button" onClick={()=>onChange(id)} className={`rounded-xl px-3 py-2 text-sm font-semibold ${value===id?"bg-amber-400 text-black":"bg-black/20 text-white/60"}`}>{label}</button>)}</div>;
}

export default function RebornSong() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Top 500");
  const { t: tr } = useTranslation();
  return (
    <RebornLayout active="/songs" title={tr("vn.song.title")}>
      <div className="flex gap-1 p-1 rounded-full bg-white/5 border border-white/10 mb-5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-full text-xs font-semibold transition-colors ${tab === t ? "text-black" : "text-white/60"}`} style={tab === t ? { background: "linear-gradient(90deg,#c9a84c,#f0d787)" } : undefined}>{tr(TAB_KEYS[t])}</button>
        ))}
      </div>
      {tab !== "Queue" && <NowSinging onOpen={() => setTab("Queue")} />}
      {tab === "Top 500" && <TopList />}
      {tab === "Request" && <NewRequest />}
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
  const q = useSongQueue();
  if (!q) return null;
  const list: any[] = q.queue || [];
  return (
    <div className="space-y-2">
      <div className="rounded-3xl p-4 border border-fuchsia-400/30" style={{ background: "linear-gradient(135deg,rgba(217,70,239,.18),rgba(201,168,76,.12))" }}>
        <p className="text-[11px] font-bold tracking-wider text-fuchsia-200/80 uppercase">🎤 {t("vn.song.nowSinging")}{q.paused ? ` · ⏸ ${t("vn.song.paused")}` : ""}</p>
        {q.nowPlaying ? (<>
          <p className="text-lg font-black mt-1">{q.nowPlaying.title}</p>
          <p className="text-xs text-white/60">{q.nowPlaying.artist || "—"}</p>
          <p className="mt-2 inline-block px-2.5 py-1 rounded-full bg-black/30 text-xs font-bold text-amber-200">{who(t, q.nowPlaying)}{q.nowPlaying.mine ? ` · ${t("vn.song.you")}` : ""}</p>
        </>) : <p className="text-sm text-white/60 mt-1">{t("vn.song.nobodySinging")}</p>}
      </div>
      <p className="text-xs text-white/50 px-1">{q.mode === "table" ? t("vn.song.fairNoteTable", { n: q.perTurn ?? 1 }) : t("vn.song.fairNoteUser", { n: q.perTurn ?? 1 })}</p>
      {list.length === 0 && <div className="text-center py-8 text-white/40"><Music2 className="w-9 h-9 mx-auto mb-2 opacity-30" /><p className="text-sm">{t("vn.song.queueEmpty")}</p></div>}
      {list.map((r) => (
        <div key={r.id} className={`flex items-center gap-3 p-3 rounded-2xl border ${r.mine ? "border-amber-400/60 bg-amber-400/10" : "border-white/10 bg-white/5"}`}>
          <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black text-black" style={{ background: "linear-gradient(135deg,#c9a84c,#f0d787)" }}>{r.position}</span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold truncate">{r.title}{r.artist ? <span className="text-white/45 font-normal"> · {r.artist}</span> : null}</span>
            <span className="block text-xs text-white/55 truncate">{who(t, r)}{r.mine ? <b className="text-amber-300"> · {t("vn.song.you")}</b> : null}</span>
          </span>
          {r.position === 1 && <span className="text-[10px] font-bold text-emerald-300 flex-shrink-0">{t("vn.song.upNext")}</span>}
        </div>
      ))}
    </div>
  );
}

function SongRow({ s, onRequest, pending }: any) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
      {s.artistPhoto ? <img src={s.artistPhoto} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
        : <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,168,76,0.15)" }}><Music2 className="w-5 h-5 text-amber-300" /></span>}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate flex items-center gap-1">{s.title}{s.titlePinyin && <span className="text-[11px] font-normal text-white/40">{s.titlePinyin}</span>}{s.isHit && <span className="text-[10px] font-bold text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded">{t("vn.song.hit")}</span>}</p>
        <p className="text-xs text-white/50 truncate">{s.artist || t("vn.song.singerOptional")}{s.artistPinyin && <span className="text-white/30"> · {s.artistPinyin}</span>}{s.spotifyUrl && <a href={s.spotifyUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-0.5 text-emerald-400"><ExternalLink className="w-3 h-3" /> Spotify</a>}{!s.spotifyUrl && s.catalogUrl && <a href={s.catalogUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-0.5 text-cyan-300"><ExternalLink className="w-3 h-3" /> {s.source === "apple" ? "Apple" : "MusicBrainz"}</a>}</p>
      </div>
      <button onClick={() => onRequest(s)} disabled={pending} className="px-3 py-1.5 rounded-full text-xs font-bold text-black flex-shrink-0" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>{t("vn.song.request")}</button>
    </div>
  );
}

function TopList() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const search = useDebounced(q);
  const [performanceMode, setPerformanceMode] = useState("self");
  const { data: songSettings } = useQuery<any>({ queryKey: ["/api/reborn/song-settings"], queryFn: () => apiRequest("GET", "/api/reborn/song-settings").then((r) => r.json()) });
  const { data: songs = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/songs"], queryFn: () => apiRequest("GET", "/api/reborn/songs").then((r) => r.json()) });
  const { data: searchResult, isFetching } = useQuery<SearchResponse>({
    queryKey: ["/api/reborn/songs/search", search],
    queryFn: () => apiRequest("GET", `/api/reborn/songs/search?q=${encodeURIComponent(search)}`).then((r) => r.json()),
    enabled: search.length > 0,
  });
  const req = useMutation({
    mutationFn: (song: any) => apiRequest("POST", "/api/reborn/songs/request", song.id && song.source !== "spotify" ? { songId: song.id, performanceMode } : { ...song, id: undefined, source: undefined, externalId: undefined, performanceMode }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: t("vn.song.requested"), description: d.message }); qc.invalidateQueries({ queryKey: ["/api/reborn/songs/my-requests"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/songs"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/song-queue"] }); },
    onError: (e: any) => { qc.invalidateQueries({ queryKey: ["/api/reborn/song-queue-info"] }); toast({ title: t("vn.common.failed"), description: errText(e), variant: "destructive" }); },
  });
  const qi = useSongQueueInfo();
  const filtered = search ? (searchResult?.songs || []) : songs;
  // Long lists render in pages of 60 so phones stay fast; "Show more" reveals the rest.
  const [shown, setShown] = useState(60);
  useEffect(() => setShown(60), [search]);
  return (
    <div>
      <TableScanNotice qi={qi} />
      {songSettings?.performanceModeEnabled && <ModePicker value={performanceMode} onChange={setPerformanceMode}/>}
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("vn.song.searchPh")} className="w-full pl-9 pr-4 py-3 rounded-full bg-black/30 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60" />
      </div>
      {search && <p className="mb-3 text-xs text-white/40">{isFetching ? t("vn.song.searchingAll") : searchResult?.spotifyConnected ? t("vn.song.resultsSpotify") : t("vn.song.resultsFree")}</p>}
      {filtered.length === 0 && <div className="text-center py-10 text-white/40"><Music2 className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>{t("vn.song.noSongs")}</p></div>}
      {!search && songs.length > 0 && <p className="mb-2 text-xs text-white/40">{t("vn.song.total", { n: songs.length })}</p>}
      <div className="space-y-2">{filtered.slice(0, shown).map((s) => <SongRow key={`${s.source || "library"}-${s.id || s.externalId || `${s.title}-${s.artist}`}`} s={s} onRequest={(x: any) => (qi?.needTable ? toast({ title: t("vn.song.needTableTitle"), description: t("vn.song.needTableBody"), variant: "destructive" }) : req.mutate(x))} pending={req.isPending} />)}</div>
      {filtered.length > shown && <button onClick={() => setShown((n) => n + 60)} className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white/80">{t("vn.song.showMore", { n: filtered.length - shown })}</button>}
    </div>
  );
}

function NewRequest() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [f, setF] = useState({ title: "", titlePinyin: "", artist: "", artistPinyin: "", spotifyUrl: "", performanceMode: "self" });
  const search = useDebounced(f.title);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const { data: songSettings } = useQuery<any>({ queryKey: ["/api/reborn/song-settings"], queryFn: () => apiRequest("GET", "/api/reborn/song-settings").then((r) => r.json()) });
  const { data: searchResult, isFetching } = useQuery<SearchResponse>({
    queryKey: ["/api/reborn/songs/search", search],
    queryFn: () => apiRequest("GET", `/api/reborn/songs/search?q=${encodeURIComponent(search)}`).then((r) => r.json()),
    enabled: search.length > 0 && showSuggestions,
  });
  const req = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/songs/request", f).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: t("vn.song.requestSent"), description: d.message }); setF({ title: "", titlePinyin: "", artist: "", artistPinyin: "", spotifyUrl: "", performanceMode: "self" }); qc.invalidateQueries({ queryKey: ["/api/reborn/songs/my-requests"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/songs"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/song-queue"] }); },
    onError: (e: any) => { qc.invalidateQueries({ queryKey: ["/api/reborn/song-queue-info"] }); toast({ title: t("vn.common.failed"), description: errText(e), variant: "destructive" }); },
  });
  const inp = "w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60";
  const qi = useSongQueueInfo();
  const needTable = !!qi?.needTable;
  const canSend = !needTable && (f.title.trim() || f.titlePinyin.trim());
  return (
    <div className="rounded-3xl p-5 border border-white/10 bg-white/5">
      <h3 className="font-bold mb-1 flex items-center gap-2"><Mic2 className="w-5 h-5 text-amber-300" /> {t("vn.song.requestASong")}</h3>
      <p className="text-sm text-white/60 mb-4">{t("vn.song.requestHelp")}</p>
      <TableScanNotice qi={qi} />
      {songSettings?.performanceModeEnabled && <ModePicker value={f.performanceMode} onChange={(performanceMode)=>setF({...f,performanceMode})}/>}
      <div className="relative mb-3">
        <input value={f.title} onChange={(e) => { setF({ ...f, title: e.target.value }); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} placeholder={t("vn.song.namePh")} className={inp} autoComplete="off" />
        {showSuggestions && search && <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-white/15 bg-[#101524] p-2 shadow-2xl">
          {isFetching && <p className="p-3 text-sm text-white/50">{t("vn.song.searching")}</p>}
          {!isFetching && (searchResult?.songs || []).map((song) => <button key={`${song.source}-${song.id || song.externalId}`} type="button" onClick={() => { setF({ ...f, title: song.title, titlePinyin: song.titlePinyin || "", artist: song.artist || "", artistPinyin: song.artistPinyin || "", spotifyUrl: song.spotifyUrl || "" }); setShowSuggestions(false); }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-white/10">
            <Music2 className="h-4 w-4 shrink-0 text-amber-300" />
            <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{song.title}</span><span className="block truncate text-xs text-white/50">{song.artist || t("vn.song.singerNotListed")}{song.titlePinyin ? ` · ${song.titlePinyin}` : ""}</span></span>
            {song.source === "spotify" && <span className="text-[10px] font-bold text-emerald-400">SPOTIFY</span>}
            {song.source === "musicbrainz" && <span className="text-[10px] font-bold text-cyan-300">MUSICBRAINZ</span>}
            {song.source === "apple" && <span className="text-[10px] font-bold text-rose-300">APPLE</span>}
          </button>)}
          {!isFetching && searchResult?.songs?.length === 0 && <p className="p-3 text-sm text-white/50">{t("vn.song.noMatch")}</p>}
        </div>}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 mb-3">
        <input value={f.titlePinyin} onChange={(e) => setF({ ...f, titlePinyin: e.target.value })} placeholder={t("vn.song.pinyinPh")} className={inp} />
        <input value={f.artist} onChange={(e) => setF({ ...f, artist: e.target.value })} placeholder={t("vn.song.singerPh")} className={inp} />
        <input value={f.artistPinyin} onChange={(e) => setF({ ...f, artistPinyin: e.target.value })} placeholder={t("vn.song.singerPinyinPh")} className={inp} />
      </div>
      <input value={f.spotifyUrl} onChange={(e) => setF({ ...f, spotifyUrl: e.target.value })} placeholder={t("vn.song.spotifyPh")} className={inp + " mb-3"} />
      <button onClick={() => req.mutate()} disabled={!canSend || req.isPending} className="w-full py-3 rounded-xl font-bold text-black disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}><Plus className="w-4 h-4" /> {t("vn.song.sendRequest")}</button>
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
          <div className="flex-1 min-w-0"><p className="font-semibold truncate">{r.title}</p><p className="text-xs text-white/50 truncate">{r.artist || "—"} · {r.performanceMode === "singer" ? t("vn.song.bySinger") : t("vn.song.selfSing")} · {new Date(r.createdAt).toLocaleDateString(localeTag(language))}</p></div>
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
