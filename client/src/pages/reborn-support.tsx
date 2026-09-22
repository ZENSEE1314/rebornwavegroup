import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { ChevronDown, Send, HelpCircle, MessageCircle } from "lucide-react";

const TABS = ["FAQ", "Chat with admin"] as const;

export default function RebornSupport() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("FAQ");
  return (
    <RebornLayout active="/support" title="SUPPORT">
      <div className="flex gap-1 p-1 rounded-full bg-white/5 border border-white/10 mb-5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${tab === t ? "text-black" : "text-white/60"}`} style={tab === t ? { background: "linear-gradient(90deg,#c9a84c,#f0d787)" } : undefined}>{t}</button>
        ))}
      </div>
      {tab === "FAQ" ? <Faq /> : <Chat />}
    </RebornLayout>
  );
}

function Faq() {
  const { data: items = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/faq"],
    queryFn: () => apiRequest("GET", "/api/reborn/faq").then((r) => r.json()),
  });
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      <p className="text-white/50 text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" /> Common questions</p>
      {items.map((f) => (
        <div key={f.id} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <button onClick={() => setOpen(open === f.id ? null : f.id)} className="w-full flex items-center justify-between gap-3 p-4 text-left">
            <span className="font-semibold text-sm">{f.question}</span>
            <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${open === f.id ? "rotate-180" : ""}`} />
          </button>
          {open === f.id && <div className="px-4 pb-4 text-sm text-white/65 leading-relaxed">{f.answer}</div>}
        </div>
      ))}
      {items.length === 0 && <p className="text-white/40 text-center py-8">No FAQs yet.</p>}
    </div>
  );
}

function Chat() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
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
            <p>Ask us anything. Common questions get an instant answer; the rest reach our admin.</p>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.senderType === "user";
          const isBot = m.senderType === "ai";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${mine ? "rounded-br-sm text-black" : "rounded-bl-sm text-white/85 bg-white/8 border border-white/10"}`} style={mine ? { background: "linear-gradient(90deg,#c9a84c,#f0d787)" } : undefined}>
                {!mine && <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: isBot ? "#45b7d1" : "#c084fc" }}>{isBot ? "AI assistant" : "Admin"}</div>}
                {m.content}
              </div>
            </div>
          );
        })}
      </div>
      <div className="sticky bottom-24 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) send.mutate(); }}
          placeholder="Type your message…" className="flex-1 px-4 py-3 rounded-full bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60" />
        <button onClick={() => text.trim() && send.mutate()} disabled={send.isPending || !text.trim()} className="w-12 h-12 rounded-full flex items-center justify-center text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
