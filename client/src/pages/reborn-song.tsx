import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { useToast } from "@/hooks/use-toast";
import { Search, Music2, Check, Clock, X, Plus, ExternalLink, Mic2 } from "lucide-react";

const TABS = ["Top 500", "Request", "My Requests"] as const;

function useDebounced(value: string, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(value.trim()), delay); return () => window.clearTimeout(timer); }, [value, delay]);
  return debounced;
}

type SearchResponse = { songs: any[]; spotifyConnected: boolean };

function ModePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">{[["self","Self sing"],["singer","By singer"]].map(([id,label])=><button key={id} type="button" onClick={()=>onChange(id)} className={`rounded-xl px-3 py-2 text-sm font-semibold ${value===id?"bg-amber-400 text-black":"bg-black/20 text-white/60"}`}>{label}</button>)}</div>;
}

export default function RebornSong() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Top 500");
  return (
    <RebornLayout active="/songs" title="SONG REQUEST">
      <div className="flex gap-1 p-1 rounded-full bg-white/5 border border-white/10 mb-5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-full text-xs font-semibold transition-colors ${tab === t ? "text-black" : "text-white/60"}`} style={tab === t ? { background: "linear-gradient(90deg,#c9a84c,#f0d787)" } : undefined}>{t}</button>
        ))}
      </div>
      {tab === "Top 500" && <TopList />}
      {tab === "Request" && <NewRequest />}
      {tab === "My Requests" && <MyRequests />}
    </RebornLayout>
  );
}

function SongRow({ s, onRequest, pending }: any) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
      {s.artistPhoto ? <img src={s.artistPhoto} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
        : <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,168,76,0.15)" }}><Music2 className="w-5 h-5 text-amber-300" /></span>}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate flex items-center gap-1">{s.title}{s.titlePinyin && <span className="text-[11px] font-normal text-white/40">{s.titlePinyin}</span>}{s.isHit && <span className="text-[10px] font-bold text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded">HIT</span>}</p>
        <p className="text-xs text-white/50 truncate">{s.artist || "Singer optional"}{s.artistPinyin && <span className="text-white/30"> · {s.artistPinyin}</span>}{s.spotifyUrl && <a href={s.spotifyUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-0.5 text-emerald-400"><ExternalLink className="w-3 h-3" /> Spotify</a>}</p>
      </div>
      <button onClick={() => onRequest(s)} disabled={pending} className="px-3 py-1.5 rounded-full text-xs font-bold text-black flex-shrink-0" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>Request</button>
    </div>
  );
}

function TopList() {
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
    onSuccess: (d) => { toast({ title: "Requested!", description: d.message }); qc.invalidateQueries({ queryKey: ["/api/reborn/songs/my-requests"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/songs"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const filtered = search ? (searchResult?.songs || []) : songs;
  return (
    <div>
      {songSettings?.performanceModeEnabled && <ModePicker value={performanceMode} onChange={setPerformanceMode}/>}
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a song, singer, Chinese or pinyin…" className="w-full pl-9 pr-4 py-3 rounded-full bg-black/30 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60" />
      </div>
      {search && <p className="mb-3 text-xs text-white/40">{isFetching ? "Searching songs…" : searchResult?.spotifyConnected ? "Reborn library + Spotify results" : "Reborn library results"}</p>}
      {filtered.length === 0 && <div className="text-center py-10 text-white/40"><Music2 className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No songs yet. Be the first to request one!</p></div>}
      <div className="space-y-2">{filtered.map((s) => <SongRow key={`${s.source || "library"}-${s.id || s.externalId || `${s.title}-${s.artist}`}`} s={s} onRequest={(x: any) => req.mutate(x)} pending={req.isPending} />)}</div>
    </div>
  );
}

function NewRequest() {
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
    onSuccess: (d) => { toast({ title: "Request sent!", description: d.message }); setF({ title: "", titlePinyin: "", artist: "", artistPinyin: "", spotifyUrl: "", performanceMode: "self" }); qc.invalidateQueries({ queryKey: ["/api/reborn/songs/my-requests"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/songs"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const inp = "w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60";
  const canSend = f.title.trim() || f.titlePinyin.trim();
  return (
    <div className="rounded-3xl p-5 border border-white/10 bg-white/5">
      <h3 className="font-bold mb-1 flex items-center gap-2"><Mic2 className="w-5 h-5 text-amber-300" /> Request a song</h3>
      <p className="text-sm text-white/60 mb-4">Start typing a song, Chinese title or pinyin. Pick a match to fill the song and singer automatically, or enter any Malay or other song manually.</p>
      {songSettings?.performanceModeEnabled && <ModePicker value={f.performanceMode} onChange={(performanceMode)=>setF({...f,performanceMode})}/>}
      <div className="relative mb-3">
        <input value={f.title} onChange={(e) => { setF({ ...f, title: e.target.value }); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} placeholder="Song name, 中文 or pinyin" className={inp} autoComplete="off" />
        {showSuggestions && search && <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-white/15 bg-[#101524] p-2 shadow-2xl">
          {isFetching && <p className="p-3 text-sm text-white/50">Searching…</p>}
          {!isFetching && (searchResult?.songs || []).map((song) => <button key={`${song.source}-${song.id || song.externalId}`} type="button" onClick={() => { setF({ ...f, title: song.title, titlePinyin: song.titlePinyin || "", artist: song.artist || "", artistPinyin: song.artistPinyin || "", spotifyUrl: song.spotifyUrl || "" }); setShowSuggestions(false); }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-white/10">
            <Music2 className="h-4 w-4 shrink-0 text-amber-300" />
            <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{song.title}</span><span className="block truncate text-xs text-white/50">{song.artist || "Singer not listed"}{song.titlePinyin ? ` · ${song.titlePinyin}` : ""}</span></span>
            {song.source === "spotify" && <span className="text-[10px] font-bold text-emerald-400">SPOTIFY</span>}
          </button>)}
          {!isFetching && searchResult?.songs?.length === 0 && <p className="p-3 text-sm text-white/50">No match. Keep the title and send it manually.</p>}
        </div>}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 mb-3">
        <input value={f.titlePinyin} onChange={(e) => setF({ ...f, titlePinyin: e.target.value })} placeholder="Song pinyin" className={inp} />
        <input value={f.artist} onChange={(e) => setF({ ...f, artist: e.target.value })} placeholder="Singer (optional)" className={inp} />
        <input value={f.artistPinyin} onChange={(e) => setF({ ...f, artistPinyin: e.target.value })} placeholder="Singer pinyin (optional)" className={inp} />
      </div>
      <input value={f.spotifyUrl} onChange={(e) => setF({ ...f, spotifyUrl: e.target.value })} placeholder="Spotify link (optional)" className={inp + " mb-3"} />
      <button onClick={() => req.mutate()} disabled={!canSend || req.isPending} className="w-full py-3 rounded-xl font-bold text-black disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}><Plus className="w-4 h-4" /> Send request</button>
    </div>
  );
}

function MyRequests() {
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/songs/my-requests"], queryFn: () => apiRequest("GET", "/api/reborn/songs/my-requests").then((r) => r.json()), refetchInterval: 10000, refetchOnWindowFocus: true });
  if (rows.length === 0) return <div className="text-center py-12 text-white/40"><Music2 className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>You haven't requested any songs yet.</p></div>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex-1 min-w-0"><p className="font-semibold truncate">{r.title}</p><p className="text-xs text-white/50 truncate">{r.artist || "—"} · {r.performanceMode === "singer" ? "By singer" : "Self sing"} · {new Date(r.createdAt).toLocaleDateString()}</p></div>
          {r.status === "confirmed" ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400"><Check className="w-4 h-4" /> Confirmed</span>
            : r.status === "rejected" ? <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400"><X className="w-4 h-4" /> Declined</span>
            : <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300"><Clock className="w-4 h-4" /> Pending</span>}
        </div>
      ))}
    </div>
  );
}
