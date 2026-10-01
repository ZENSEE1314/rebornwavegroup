import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { useToast } from "@/hooks/use-toast";
import { useTranslation, translate, localeTag } from "@/lib/i18n";
import { Send, ArrowLeft, Check, X, UserPlus, MessageCircle, Users, Clock, ImagePlus, Trash2, MoreVertical } from "lucide-react";

function nameOf(u: any) { return u?.username || u?.firstName || translate("vn.common.member"); }
function initials(u: any) { return (nameOf(u)[0] || "?").toUpperCase(); }
function Avatar({ u }: any) {
  return u?.photo
    ? <img src={u.photo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
    : <span className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-black flex-shrink-0" style={{ background: "linear-gradient(135deg,#ec4899,#c9a84c)" }}>{initials(u)}</span>;
}

export default function RebornChat() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [active, setActive] = useState<any>(null);
  const { t } = useTranslation();
  const { data } = useQuery<{ friends: any[]; incoming: any[]; outgoing: any[] }>({
    queryKey: ["/api/reborn/chat/friends"],
    queryFn: () => apiRequest("GET", "/api/reborn/chat/friends").then((r) => r.json()),
    refetchInterval: 10000,
  });
  const respond = useMutation({
    mutationFn: ({ id, accept }: any) => apiRequest("POST", "/api/reborn/chat/respond", { id, accept }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: d.message }); qc.invalidateQueries({ queryKey: ["/api/reborn/chat/friends"] }); },
  });

  if (active) return <ChatThread friend={active.user} onBack={() => setActive(null)} />;

  const incoming = data?.incoming || [];
  const friends = data?.friends || [];
  const outgoing = data?.outgoing || [];

  return (
    <RebornLayout active="/chat" title={t("vn.chat.title")}>
      <Announcements />
      {incoming.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2 px-1">{t("vn.chat.friendRequests")}</h2>
          <div className="space-y-2 mb-5">
            {incoming.map((r) => (
              <div key={r.friendshipId} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-amber-400/20">
                <Avatar u={r.user} />
                <span className="flex-1 font-semibold truncate">{nameOf(r.user)}</span>
                <button onClick={() => respond.mutate({ id: r.friendshipId, accept: true })} title={t("vn.chat.accept")} aria-label={t("vn.chat.accept")} className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center"><Check className="w-4 h-4" /></button>
                <button onClick={() => respond.mutate({ id: r.friendshipId, accept: false })} title={t("vn.chat.decline")} aria-label={t("vn.chat.decline")} className="w-9 h-9 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2 px-1 flex items-center gap-2"><Users className="w-4 h-4" /> {t("vn.chat.friends")}</h2>
      {friends.length === 0 && (
        <div className="text-center py-10 text-white/40">
          <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{t("vn.chat.noFriendsA")} <b className="text-amber-300">{t("vn.chat.kosName")}</b> {t("vn.chat.noFriendsB")}</p>
        </div>
      )}
      <div className="space-y-2">
        {friends.map((f) => (
          <button key={f.friendshipId} onClick={() => setActive(f)} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-left">
            <Avatar u={f.user} />
            <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{nameOf(f.user)}</span><span className="block text-xs text-white/45 truncate">{f.lastMessage ? (f.lastMessage.content || (f.lastMessage.hasImage ? t("vn.chat.photo") : "")) : t("vn.chat.startConvo")}</span></span>
            {f.unread > 0
              ? <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-600 text-white text-xs font-black flex items-center justify-center" aria-label={t("nav.badge", { n: f.unread })}>{f.unread > 99 ? "99+" : f.unread}</span>
              : <MessageCircle className="w-5 h-5 text-white/40" />}
          </button>
        ))}
      </div>

      {outgoing.length > 0 && (
        <div className="mt-5">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2 px-1">{t("vn.chat.sentWaiting")}</h2>
          <div className="space-y-2">
            {outgoing.map((r) => (
              <div key={r.friendshipId} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 opacity-70">
                <Avatar u={r.user} /><span className="flex-1 truncate">{nameOf(r.user)}</span><span className="text-xs text-white/40 flex items-center gap-1"><Clock className="w-3 h-3" /> {t("vn.chat.pendingLower")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </RebornLayout>
  );
}

// Shrink a photo on the phone before sending (longest side 1280px, JPEG).
function shrinkPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function ChatThread({ friend, onBack }: any) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null); // message whose actions are open
  const [menu, setMenu] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const { t, language } = useTranslation();
  const key = ["/api/reborn/chat/messages", friend.id];
  const { data: msgs = [] } = useQuery<any[]>({
    queryKey: key,
    // reading the thread marks it read, so refresh the friend list and the dock badge
    queryFn: () => apiRequest("GET", `/api/reborn/chat/messages/${friend.id}`).then((r) => r.json()).finally(() => {
      qc.invalidateQueries({ queryKey: ["/api/reborn/badges"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/chat/friends"] });
    }),
    refetchInterval: 5000,
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["/api/reborn/chat/friends"] }); };
  const send = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/chat/send", { toUserId: friend.id, content: text.trim(), image: photo || undefined }).then((r) => r.json()),
    onSuccess: () => { setText(""); setPhoto(null); refresh(); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/reborn/chat/messages/${id}`).then((r) => r.json()),
    onSuccess: () => { setPicked(null); refresh(); },
  });
  const clear = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/reborn/chat/conversation/${friend.id}`).then((r) => r.json()),
    onSuccess: (d) => { setConfirmClear(false); setMenu(false); toast({ title: d.message }); refresh(); qc.invalidateQueries({ queryKey: ["/api/reborn/badges"] }); },
  });
  const pickPhoto = async (f?: File | null) => {
    if (!f) return;
    try { setPhoto(await shrinkPhoto(f)); } catch { toast({ title: t("vn.chat.photoFail"), variant: "destructive" }); }
    if (fileRef.current) fileRef.current.value = "";
  };
  // jump to the newest message when the chat opens and when a new one arrives
  const lastId = msgs.length ? msgs[msgs.length - 1].id : 0;
  useEffect(() => { if (lastId) endRef.current?.scrollIntoView({ block: "end" }); }, [lastId]);
  const meIsSender = (m: any) => m.senderId === friend.id ? false : true;
  const loc = localeTag(language);
  const now = new Date(), yest = new Date(Date.now() - 864e5);
  const dayLabel = (d: Date) => dayKey(d) === dayKey(now) ? t("vn.chat.today") : dayKey(d) === dayKey(yest) ? t("vn.chat.yesterday")
    : d.toLocaleDateString(loc, { weekday: "short", day: "numeric", month: "short", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
  const canSend = !!text.trim() || !!photo;

  return (
    <RebornLayout active="/chat" title={t("vn.chat.title")}>
      <button onClick={onBack} className="flex items-center gap-2 text-white/60 mb-3"><ArrowLeft className="w-4 h-4" /> {t("vn.common.back")}</button>
      <div className="relative z-30 flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
        <Avatar u={friend} /><span className="font-bold flex-1">{nameOf(friend)}</span>
        <button onClick={() => setMenu((v) => !v)} aria-label={t("vn.chat.more")} title={t("vn.chat.more")} className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:bg-white/10"><MoreVertical className="w-5 h-5" /></button>
        {menu && <div className="absolute right-0 top-12 z-20 rounded-xl border border-white/10 bg-[#170f26] shadow-xl p-1 min-w-[190px]">
          <button onClick={() => { setConfirmClear(true); setMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-300 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /> {t("vn.chat.clearChat")}</button>
        </div>}
      </div>
      {confirmClear && <div className="mb-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm">
        <p className="text-white/85 mb-2">{t("vn.chat.clearConfirm", { name: nameOf(friend) })}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setConfirmClear(false)} className="px-3 py-1.5 rounded-lg bg-white/10 text-white/80">{t("vn.chat.cancel")}</button>
          <button onClick={() => clear.mutate()} disabled={clear.isPending} className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold disabled:opacity-50">{t("vn.chat.delete")}</button>
        </div>
      </div>}
      <div className="space-y-2 mb-3" style={{ minHeight: "48vh" }} onClick={() => setPicked(null)}>
        {msgs.length === 0 && <p className="text-center text-white/40 py-10">{t("vn.chat.sayHi")}</p>}
        {msgs.map((m, i) => {
          const mine = meIsSender(m);
          const at = new Date(m.createdAt);
          const newDay = i === 0 || dayKey(new Date(msgs[i - 1].createdAt)) !== dayKey(at);
          return (
            <div key={m.id}>
              {newDay && <div className="flex justify-center my-3"><span className="px-3 py-1 rounded-full bg-white/8 border border-white/10 text-[11px] font-semibold text-white/55">{dayLabel(at)}</span></div>}
              <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <button type="button" onClick={(e) => { e.stopPropagation(); setPicked(picked === m.id ? null : m.id); }}
                  className={`max-w-[80%] text-left rounded-2xl text-sm overflow-hidden ${m.imageUrl ? "p-1" : "px-4 py-2.5"} ${mine ? "rounded-br-sm text-black" : "rounded-bl-sm text-white/85 bg-white/8 border border-white/10"} ${picked === m.id ? "ring-2 ring-amber-300/70" : ""}`}
                  style={mine ? { background: "linear-gradient(90deg,#c9a84c,#f0d787)" } : undefined}>
                  {m.imageUrl && <img src={m.imageUrl} alt="" onLoad={() => { if (m.id === lastId) endRef.current?.scrollIntoView({ block: "end" }); }} onClick={(e) => { e.stopPropagation(); setViewing(m.imageUrl); }} className="rounded-xl max-h-72 w-auto object-cover cursor-zoom-in" />}
                  {m.content && <span className={`block whitespace-pre-wrap break-words ${m.imageUrl ? "px-3 py-2" : ""}`}>{m.content}</span>}
                </button>
                <span className="text-[10px] text-white/35 mt-0.5 px-1">{at.toLocaleTimeString(loc, { hour: "numeric", minute: "2-digit" })}{mine && m.isRead ? " · ✓✓" : ""}</span>
                {picked === m.id && <button onClick={(e) => { e.stopPropagation(); del.mutate(m.id); }} disabled={del.isPending}
                  className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-bold disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /> {mine ? t("vn.chat.deleteMine") : t("vn.chat.deleteForMe")}</button>}
              </div>
            </div>
          );
        })}
      </div>
      <div ref={endRef} style={{ scrollMarginBottom: 190 }} /> {/* clears the message box + dock */}
      <div className="sticky bottom-20 -mx-4 px-4 pt-2 pb-3 bg-[#0a0714]/95 backdrop-blur-sm border-t border-white/5">
        {photo && <div className="mb-2 flex items-center gap-2"><div className="relative">
          <img src={photo} alt="" className="h-20 w-20 rounded-xl object-cover border border-white/15" />
          <button onClick={() => setPhoto(null)} aria-label={t("vn.chat.removePhoto")} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/80 border border-white/20 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
        </div></div>}
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
          <button onClick={() => fileRef.current?.click()} aria-label={t("vn.chat.addPhoto")} title={t("vn.chat.addPhoto")} className="w-12 h-12 rounded-full flex items-center justify-center bg-white/8 border border-white/10 text-white/70 flex-shrink-0"><ImagePlus className="w-5 h-5" /></button>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && canSend) send.mutate(); }} placeholder={t("vn.chat.messagePh")} className="flex-1 min-w-0 px-4 py-3 rounded-full bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60" />
          <button onClick={() => canSend && send.mutate()} aria-label={t("vn.chat.send")} title={t("vn.chat.send")} disabled={send.isPending || !canSend} className="w-12 h-12 rounded-full flex items-center justify-center text-black disabled:opacity-50 flex-shrink-0" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}><Send className="w-5 h-5" /></button>
        </div>
      </div>
      {viewing && <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4" onClick={() => setViewing(null)} role="dialog" aria-label={t("vn.chat.openPhoto")}>
        <img src={viewing} alt="" className="max-h-full max-w-full rounded-xl" />
        <button onClick={() => setViewing(null)} aria-label={t("vn.chat.close")} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center"><X className="w-5 h-5" /></button>
      </div>}
    </RebornLayout>
  );
}

// Admin broadcasts, pinned at the top of Chat. New ones (since you last opened) get a dot.
const SEEN_KEY = "rw_announce_seen";
function Announcements() {
  const { t, language } = useTranslation();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<number>(() => { try { return Number(localStorage.getItem(SEEN_KEY)) || 0; } catch { return 0; } });
  const { data = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/announcements"],
    queryFn: () => apiRequest("GET", "/api/reborn/announcements").then((r) => r.json()),
    refetchInterval: 30000,
  });
  if (!data.length) return null;
  const latest = new Date(data[0].createdAt).getTime();
  const unread = data.filter((a) => new Date(a.createdAt).getTime() > seen).length;
  const toggle = () => { const next = !open; setOpen(next); if (next) { try { localStorage.setItem(SEEN_KEY, String(latest)); } catch {} setSeen(latest); } };
  const when = (d: string) => new Date(d).toLocaleString(localeTag(language), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return (
    <div className="mb-5">
      <button onClick={toggle} className="w-full flex items-center gap-3 p-3 rounded-2xl text-left border border-amber-400/40" style={{ background: "linear-gradient(135deg,rgba(240,215,135,0.16),rgba(236,72,153,0.10))" }}>
        <span className="relative w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ background: "linear-gradient(135deg,#f0d787,#c9a84c)" }}>
          📢{unread > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">{unread}</span>}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-amber-200">{t("vn.chat.announce")}</span>
          <span className="block text-xs text-white/55 truncate">{data[0].title}</span>
        </span>
        <span className="text-white/40 text-sm">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {data.map((a) => (
            <div key={a.id} className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <p className="font-bold text-white">{a.title}</p>
              {a.body && <p className="text-sm text-white/75 whitespace-pre-line mt-1 break-words">{a.body}</p>}
              <p className="text-[11px] text-white/35 mt-2">{when(a.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
