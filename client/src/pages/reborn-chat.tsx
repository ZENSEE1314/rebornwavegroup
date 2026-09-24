import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { useToast } from "@/hooks/use-toast";
import { Send, ArrowLeft, Check, X, UserPlus, MessageCircle, Users, Clock } from "lucide-react";

function nameOf(u: any) { return u?.username || u?.firstName || "Member"; }
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
    <RebornLayout active="/chat" title="CHAT">
      {incoming.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2 px-1">Friend requests</h2>
          <div className="space-y-2 mb-5">
            {incoming.map((r) => (
              <div key={r.friendshipId} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-amber-400/20">
                <Avatar u={r.user} />
                <span className="flex-1 font-semibold truncate">{nameOf(r.user)}</span>
                <button onClick={() => respond.mutate({ id: r.friendshipId, accept: true })} className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center"><Check className="w-4 h-4" /></button>
                <button onClick={() => respond.mutate({ id: r.friendshipId, accept: false })} className="w-9 h-9 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2 px-1 flex items-center gap-2"><Users className="w-4 h-4" /> Friends</h2>
      {friends.length === 0 && (
        <div className="text-center py-10 text-white/40">
          <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No friends yet. Add members from the <b className="text-amber-300">Kings of Singers</b> page — once they accept, you can chat here.</p>
        </div>
      )}
      <div className="space-y-2">
        {friends.map((f) => (
          <button key={f.friendshipId} onClick={() => setActive(f)} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-left">
            <Avatar u={f.user} />
            <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{nameOf(f.user)}</span><span className="block text-xs text-white/45 truncate">{f.lastMessage?.content || "Start a conversation"}</span></span>
            <MessageCircle className="w-5 h-5 text-white/40" />
          </button>
        ))}
      </div>

      {outgoing.length > 0 && (
        <div className="mt-5">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2 px-1">Sent (waiting)</h2>
          <div className="space-y-2">
            {outgoing.map((r) => (
              <div key={r.friendshipId} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 opacity-70">
                <Avatar u={r.user} /><span className="flex-1 truncate">{nameOf(r.user)}</span><span className="text-xs text-white/40 flex items-center gap-1"><Clock className="w-3 h-3" /> pending</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </RebornLayout>
  );
}

function ChatThread({ friend, onBack }: any) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const key = ["/api/reborn/chat/messages", friend.id];
  const { data: msgs = [] } = useQuery<any[]>({
    queryKey: key,
    queryFn: () => apiRequest("GET", `/api/reborn/chat/messages/${friend.id}`).then((r) => r.json()),
    refetchInterval: 5000,
  });
  const send = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/chat/send", { toUserId: friend.id, content: text.trim() }).then((r) => r.json()),
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: key }); },
  });
  const meIsSender = (m: any) => m.senderId === friend.id ? false : true;

  return (
    <RebornLayout active="/chat" title="CHAT">
      <button onClick={onBack} className="flex items-center gap-2 text-white/60 mb-3"><ArrowLeft className="w-4 h-4" /> Back</button>
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10"><Avatar u={friend} /><span className="font-bold">{nameOf(friend)}</span></div>
      <div className="space-y-2 mb-3" style={{ minHeight: "48vh" }}>
        {msgs.length === 0 && <p className="text-center text-white/40 py-10">Say hi 👋</p>}
        {msgs.map((m) => {
          const mine = meIsSender(m);
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${mine ? "rounded-br-sm text-black" : "rounded-bl-sm text-white/85 bg-white/8 border border-white/10"}`} style={mine ? { background: "linear-gradient(90deg,#c9a84c,#f0d787)" } : undefined}>{m.content}</div>
            </div>
          );
        })}
      </div>
      <div className="sticky bottom-24 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) send.mutate(); }} placeholder="Message…" className="flex-1 px-4 py-3 rounded-full bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60" />
        <button onClick={() => text.trim() && send.mutate()} disabled={send.isPending || !text.trim()} className="w-12 h-12 rounded-full flex items-center justify-center text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}><Send className="w-5 h-5" /></button>
      </div>
    </RebornLayout>
  );
}
