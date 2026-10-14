import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { useTranslation } from "@/lib/i18n";
import { ChevronDown, Send, HelpCircle, MessageCircle, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TABS = ["FAQ", "Chat with admin", "Rate staff"] as const;
const TAB_KEYS: Record<(typeof TABS)[number], string> = { "FAQ": "vn.sup.tabFaq", "Chat with admin": "vn.sup.tabChat", "Rate staff": "vn.sup.tabRate" };

export default function RebornSupport() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("FAQ");
  const { t: tr } = useTranslation();
  return (
    <RebornLayout active="/support" title={tr("vn.sup.title")}>
      <div className="flex gap-1 p-1 rounded-full bg-white/5 border border-white/10 mb-5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${tab === t ? "text-black" : "text-white/60"}`} style={tab === t ? { background: "linear-gradient(90deg,#c9a84c,#f0d787)" } : undefined}>{tr(TAB_KEYS[t])}</button>
        ))}
      </div>
      {tab === "FAQ" ? <Faq /> : tab === "Chat with admin" ? <Chat /> : <RateStaff />}
    </RebornLayout>
  );
}

function Faq() {
  const { t } = useTranslation();
  const { data: items = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/faq"],
    queryFn: () => apiRequest("GET", "/api/reborn/faq").then((r) => r.json()),
  });
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      <p className="text-white/50 text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" /> {t("vn.sup.common")}</p>
      {items.map((f) => (
        <div key={f.id} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <button onClick={() => setOpen(open === f.id ? null : f.id)} className="w-full flex items-center justify-between gap-3 p-4 text-left">
            <span className="font-semibold text-sm">{f.question}</span>
            <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${open === f.id ? "rotate-180" : ""}`} />
          </button>
          {open === f.id && <div className="px-4 pb-4 text-sm text-white/65 leading-relaxed">{f.answer}</div>}
        </div>
      ))}
      {items.length === 0 && <p className="text-white/40 text-center py-8">{t("vn.sup.noFaq")}</p>}
    </div>
  );
}

function Chat() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const { t } = useTranslation();
  const { data } = useQuery<{ ticketId: number; messages: any[] }>({
    queryKey: ["/api/reborn/support/messages"],
    queryFn: () => apiRequest("GET", "/api/reborn/support/messages").then((r) => r.json()),
    refetchInterval: 8000,
  });
  const messages = data?.messages || [];
  const send = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/support/ask", { message: text.trim() }).then((r) => r.json()),
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["/api/reborn/support/messages"] }); },
  });

  return (
    <div className="flex flex-col" style={{ minHeight: "58vh" }}>
      <div className="flex-1 space-y-3 mb-3">
        {messages.length === 0 && (
          <div className="text-center py-10 text-white/40">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{t("vn.sup.askAnything")}</p>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.senderType === "user";
          const isBot = m.senderType === "ai";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${mine ? "rounded-br-sm text-black" : "rounded-bl-sm text-white/85 bg-white/8 border border-white/10"}`} style={mine ? { background: "linear-gradient(90deg,#c9a84c,#f0d787)" } : undefined}>
                {!mine && <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: isBot ? "#45b7d1" : "#c084fc" }}>{isBot ? t("vn.sup.aiAssistant") : t("vn.sup.admin")}</div>}
                {m.content}
              </div>
            </div>
          );
        })}
      </div>
      <div className="sticky bottom-24 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) send.mutate(); }}
          placeholder={t("vn.sup.messagePh")} className="flex-1 px-4 py-3 rounded-full bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60" />
        <button onClick={() => text.trim() && send.mutate()} aria-label={t("vn.chat.send")} title={t("vn.chat.send")} disabled={send.isPending || !text.trim()} className="w-12 h-12 rounded-full flex items-center justify-center text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

interface StaffRow { id: string; name: string; photo: string | null; position: string | null; rating: number; reviews: number; myRating: number | null }

function RateStaff() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: staff = [] } = useQuery<StaffRow[]>({ queryKey: ["/api/reborn/support/staff"], queryFn: () => apiRequest("GET", "/api/reborn/support/staff").then((r) => r.json()) });
  const [pickedId, setPickedId] = useState("");
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const picked = staff.find((s) => s.id === pickedId);
  const choose = (s: StaffRow) => { setPickedId(s.id); setStars(s.myRating || 0); setComment(""); };
  const send = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/support/rate-staff", { staffUserId: pickedId, rating: stars, comment: comment.trim() }).then((r) => r.json()),
    onSuccess: (d: { message: string }) => { toast({ title: d.message }); setPickedId(""); setStars(0); setComment(""); qc.invalidateQueries({ queryKey: ["/api/reborn/support/staff"] }); },
    onError: (e: any) => toast({ title: t("vn.sup.rateFailed"), description: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" }),
  });
  return (
    <div className="space-y-3">
      <p className="text-white/50 text-sm">{t("vn.sup.rateHint")}</p>
      {staff.length === 0 && <p className="text-white/40 text-center py-8">{t("vn.sup.noStaff")}</p>}
      {staff.map((s) => (
        <button key={s.id} type="button" onClick={() => choose(s)} className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left ${pickedId === s.id ? "border-amber-400/60 bg-amber-400/10" : "border-white/10 bg-white/5"}`}>
          {s.photo ? <img src={s.photo} alt="" className="w-11 h-11 rounded-full object-cover" /> : <span className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center font-bold">{(s.name[0] || "?").toUpperCase()}</span>}
          <span className="flex-1 min-w-0">
            <span className="block font-semibold text-sm truncate">{s.name}</span>
            <span className="block text-xs text-white/45 truncate">{s.position || t("vn.sup.teamMember")}</span>
          </span>
          <span className="text-right text-xs text-amber-200">{s.reviews > 0 ? `\u2605 ${s.rating.toFixed(1)} \u00b7 ${t("vn.sup.reviews", { n: s.reviews })}` : t("vn.sup.noReviews")}</span>
        </button>
      ))}
      {picked && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <p className="font-bold text-sm">{t("vn.sup.rateTitle", { name: picked.name })}</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setStars(n)} aria-label={t(n === 1 ? "vn.fb.star" : "vn.fb.stars", { n })} className="w-11 h-11 inline-flex items-center justify-center">
                <Star className={`w-8 h-8 ${n <= stars ? "text-amber-300 fill-amber-300" : "text-white/25"}`} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} placeholder={t("vn.sup.commentPh")} className="w-full min-h-24 px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60" />
          {picked.myRating ? <p className="text-xs text-white/45">{t("vn.sup.rateAgain", { n: picked.myRating })}</p> : null}
          <button type="button" onClick={() => stars && send.mutate()} disabled={send.isPending || !stars} className="w-full min-h-[44px] rounded-full font-bold text-black disabled:opacity-40" style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)" }}>{t("vn.sup.rateSend")}</button>
        </div>
      )}
    </div>
  );
}
