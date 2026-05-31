import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, Loader2, RadioTower, RefreshCw, Send, ShieldCheck, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

type SocialPost = {
  id: number;
  title: string;
  campaignType: string;
  language: string;
  channels: string[];
  content: string;
  hashtags?: string | null;
  mediaUrl?: string | null;
  mediaType: string;
  cta?: string | null;
  status: string;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  lastError?: string | null;
};

type ConnectionStatus = {
  instagramReady: boolean;
  tiktokReady: boolean;
  schedulerEnabled: boolean;
  approvalMode: string;
  requiredEnv: Record<string, string[]>;
};

const statusTone: Record<string, string> = {
  draft: "bg-slate-700 text-slate-100",
  approved: "bg-amber-500 text-slate-950",
  scheduled: "bg-amber-500 text-slate-950",
  publishing: "bg-cyan-500 text-slate-950",
  published: "bg-emerald-500 text-slate-950",
  failed: "bg-red-500 text-white",
  needs_connection: "bg-violet-500 text-white",
};

function asDateInput(value?: string | null) {
  const date = value ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function SocialMediaCommandCenter() {
  const [draft, setDraft] = useState({
    title: "",
    content: "",
    channels: ["instagram", "tiktok"],
    hashtags: "#RebornWaveGroup #Batam",
    mediaUrl: "",
    mediaType: "video",
    campaignType: "customer",
    language: "en",
    cta: "",
    scheduledAt: asDateInput(),
  });

  const { data: status, isLoading: statusLoading } = useQuery<ConnectionStatus>({
    queryKey: ["/api/admin/social/status"],
  });
  const { data: posts = [], isLoading } = useQuery<SocialPost[]>({
    queryKey: ["/api/admin/social/posts"],
  });

  const stats = useMemo(() => {
    return posts.reduce<Record<string, number>>((acc, post) => {
      acc[post.status] = (acc[post.status] || 0) + 1;
      return acc;
    }, {});
  }, [posts]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/social/posts"] });

  const generateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/social/generate", {}),
    onSuccess: refresh,
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/social/posts", {
      ...draft,
      scheduledAt: new Date(draft.scheduledAt).toISOString(),
      channels: draft.channels,
    }),
    onSuccess: () => {
      setDraft((current) => ({ ...current, title: "", content: "", mediaUrl: "", cta: "" }));
      refresh();
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, scheduledAt }: { id: number; scheduledAt?: string | null }) =>
      apiRequest("POST", `/api/admin/social/posts/${id}/approve`, {
        scheduledAt: scheduledAt || new Date().toISOString(),
      }),
    onSuccess: refresh,
  });

  const publishMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/admin/social/posts/${id}/publish`, {}),
    onSuccess: refresh,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/social/posts/${id}`),
    onSuccess: refresh,
  });

  const toggleChannel = (channel: string) => {
    setDraft((current) => ({
      ...current,
      channels: current.channels.includes(channel)
        ? current.channels.filter((item) => item !== channel)
        : [...current.channels, channel],
    }));
  };

  return (
    <main className="min-h-screen bg-[#03151a] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-300">Reborn Wave Growth Agents</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">Social Command Center</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
              Generate agent content, approve posts, schedule automation, and publish through official TikTok/Instagram tokens.
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-yellow-500/20 disabled:opacity-60"
            disabled={generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
          >
            {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RadioTower className="h-4 w-4" />}
            Generate Agent Plan
          </button>
        </div>

        <section className="mb-6 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
            <p className="text-xs text-white/50">Instagram</p>
            <strong className={status?.instagramReady ? "text-emerald-300" : "text-amber-300"}>
              {statusLoading ? "Checking..." : status?.instagramReady ? "Connected" : "Needs tokens"}
            </strong>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
            <p className="text-xs text-white/50">TikTok</p>
            <strong className={status?.tiktokReady ? "text-emerald-300" : "text-amber-300"}>
              {statusLoading ? "Checking..." : status?.tiktokReady ? "Connected" : "Needs approval/tokens"}
            </strong>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
            <p className="text-xs text-white/50">Scheduler</p>
            <strong className={status?.schedulerEnabled ? "text-emerald-300" : "text-red-300"}>
              {status?.schedulerEnabled ? "Running every 10 min" : "Disabled"}
            </strong>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
            <p className="text-xs text-white/50">Queue</p>
            <strong className="text-yellow-300">{posts.length} posts</strong>
          </div>
        </section>

        <section className="mb-8 rounded-lg border border-yellow-300/20 bg-yellow-300/10 p-4 text-sm leading-6 text-yellow-50">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />
            <p>
              Automation is approval-safe. Posts generated by agents stay as drafts until you approve them. Investor posts must keep the ROI target disclaimer.
            </p>
          </div>
        </section>

        <section className="mb-8 grid gap-4 lg:grid-cols-[420px_1fr]">
          <form
            className="rounded-lg border border-white/10 bg-white/[0.06] p-5"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <h2 className="mb-4 text-xl font-black">Create Manual Post</h2>
            <div className="space-y-3">
              <input className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-sm" placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              <textarea className="min-h-28 w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-sm" placeholder="Caption content" value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
              <input className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-sm" placeholder="CTA" value={draft.cta} onChange={(e) => setDraft({ ...draft, cta: e.target.value })} />
              <input className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-sm" placeholder="Hashtags" value={draft.hashtags} onChange={(e) => setDraft({ ...draft, hashtags: e.target.value })} />
              <input className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-sm" placeholder="Public media URL, required for publishing" value={draft.mediaUrl} onChange={(e) => setDraft({ ...draft, mediaUrl: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <select className="rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-sm" value={draft.mediaType} onChange={(e) => setDraft({ ...draft, mediaType: e.target.value })}>
                  <option value="video">Video</option>
                  <option value="image">Image</option>
                  <option value="none">No media yet</option>
                </select>
                <input className="rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-sm" type="datetime-local" value={draft.scheduledAt} onChange={(e) => setDraft({ ...draft, scheduledAt: e.target.value })} />
              </div>
              <div className="flex gap-2">
                {["instagram", "tiktok"].map((channel) => (
                  <button key={channel} type="button" onClick={() => toggleChannel(channel)} className={`rounded-md px-3 py-2 text-xs font-bold ${draft.channels.includes(channel) ? "bg-cyan-300 text-slate-950" : "bg-white/10 text-white/60"}`}>
                    {channel}
                  </button>
                ))}
              </div>
              <button className="w-full rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-60" disabled={createMutation.isPending}>
                Save Draft
              </button>
            </div>
          </form>

          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black">Automation Queue</h2>
              <button className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-xs font-bold" onClick={refresh}>
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </button>
            </div>
            <div className="mb-4 flex flex-wrap gap-2 text-xs">
              {Object.entries(stats).map(([statusName, count]) => (
                <span key={statusName} className="rounded-full bg-white/10 px-3 py-1 text-white/70">{statusName}: {count}</span>
              ))}
            </div>
            {isLoading ? (
              <div className="flex h-48 items-center justify-center text-white/50"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading posts</div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <article key={post.id} className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${statusTone[post.status] || "bg-white/10"}`}>{post.status}</span>
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/60">{post.channels.join(" + ")}</span>
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/60">{post.campaignType}</span>
                    </div>
                    <h3 className="text-lg font-black">{post.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/70">{post.content}</p>
                    {post.cta && <p className="mt-2 text-sm font-bold text-yellow-300">{post.cta}</p>}
                    {post.hashtags && <p className="mt-2 text-xs text-cyan-200">{post.hashtags}</p>}
                    {post.lastError && <p className="mt-2 rounded-md bg-red-500/10 p-2 text-xs text-red-200">{post.lastError}</p>}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button className="inline-flex items-center gap-2 rounded-md bg-yellow-300 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-60" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate({ id: post.id, scheduledAt: post.scheduledAt })}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button className="inline-flex items-center gap-2 rounded-md bg-emerald-300 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-60" disabled={publishMutation.isPending} onClick={() => publishMutation.mutate(post.id)}>
                        <Send className="h-3.5 w-3.5" /> Publish Now
                      </button>
                      <span className="inline-flex items-center gap-2 text-xs text-white/50">
                        <CalendarClock className="h-3.5 w-3.5" /> {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : "No schedule"}
                      </span>
                      <button className="ml-auto inline-flex items-center gap-2 rounded-md bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200" onClick={() => deleteMutation.mutate(post.id)}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
