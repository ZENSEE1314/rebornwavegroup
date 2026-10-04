// Daily login reward (server/dailyCheckin.ts). `LoginRewardWatcher` (in RebornLayout,
// every page) collects it by itself the first time the member opens the app each day
// and plays the reward animation: coins for a normal day, a gift box opening on every
// 7th day and a crown on day 30. The home card shows this week's days and progress to
// day 30. With auto-collect off (admin), the member taps "Check in" instead and the
// 30-day calendar opens by itself once a day until they do.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { sfx } from "@/lib/sfx";
import { CalendarCheck, X } from "lucide-react";

type Reward = { type: string; amount: number; label?: string | null };
interface State {
  enabled: boolean; cycleDays: number; weekDays: number; resetOnMiss: boolean; autoClaim: boolean;
  days: Reward[]; // the admin's reward for each day: days[0] = day 1
  checkedToday: boolean; done: number; nextDay: number | null; today: string;
}
const POPUP_KEY = "reborn.checkinPopup";

function useRewardText() {
  const { t, language } = useTranslation();
  return (r: Reward) => {
    const n = Number(r.amount || 0).toLocaleString(language === "zh" ? "zh-CN" : language === "id" ? "id-ID" : "en-US");
    if (r.type === "prize") return r.label || t("hm.ci.prize");
    if (["points", "rp", "tokens", "kgold"].includes(r.type)) return t(`hm.ci.r.${r.type}`, { n });
    return "";
  };
}
// Short reward text for the small day boxes (compact numbers: 5K, 1.2M…).
function useShortReward() {
  const { t, language } = useTranslation();
  const loc = language === "zh" ? "zh-CN" : language === "id" ? "id-ID" : "en-US";
  return (r?: Reward) => {
    if (!r || r.type === "none") return "";
    if (r.type === "prize") return r.label || t("hm.ci.prize");
    return t(`hm.ci.s.${r.type}`, { n: Number(r.amount || 0).toLocaleString(loc, { notation: "compact", maximumFractionDigits: 1 }) });
  };
}
const dayIcon = (d: number, cycle: number, week: number) => (d === cycle ? "👑" : d % week === 0 ? "🎁" : "🪙");

export function DailyCheckinCard() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const rewardText = useRewardText();
  const { data: s } = useQuery<State>({ queryKey: ["/api/reborn/daily-checkin"], queryFn: () => apiRequest("GET", "/api/reborn/daily-checkin").then((r) => r.json()) });
  const [showAll, setShowAll] = useState(false);
  const [won, setWon] = useState<any>(null);
  const checkin = useMutation({
    mutationFn: async () => { const r = await apiRequest("POST", "/api/reborn/daily-checkin", {}); const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; },
    onSuccess: (d) => {
      setShowAll(false); setWon(d);
      if (d.milestone === "big") sfx.gift("fireworks"); else if (d.milestone === "week") sfx.rankUp(); else sfx.coin();
      qc.invalidateQueries({ queryKey: ["/api/reborn/daily-checkin"] });
      qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: () => qc.invalidateQueries({ queryKey: ["/api/reborn/daily-checkin"] }),
  });
  // Open the 30-day calendar by itself once a day until the member checks in.
  useEffect(() => {
    if (!s?.enabled || s.checkedToday || s.autoClaim) return; // auto-collect: LoginRewardWatcher handles it
    try { if (localStorage.getItem(POPUP_KEY) === s.today) return; localStorage.setItem(POPUP_KEY, s.today); } catch {}
    setShowAll(true);
  }, [s?.enabled, s?.checkedToday, s?.today, s?.autoClaim]);
  if (!s?.enabled) return null;

  const day = s.checkedToday ? s.done : s.nextDay || 1;
  const start = Math.floor((day - 1) / s.weekDays) * s.weekDays + 1;
  const week = Array.from({ length: Math.min(s.weekDays, s.cycleDays - start + 1) }, (_, i) => start + i);
  const toWeek = s.weekDays - (s.done % s.weekDays);
  const legend = [
    [s.checkedToday ? t("hm.ci.todayGot") : t("hm.ci.todayReward"), rewardText(s.days[day - 1])],
    ...(day < s.cycleDays ? [[t("hm.ci.day30"), rewardText(s.days[s.cycleDays - 1])]] : []),
  ].filter(([, v]) => v);

  return (
    <>
      <div className="mb-4 rounded-3xl border border-amber-400/30 p-4" style={{ background: "linear-gradient(135deg, rgba(245,158,11,.16), rgba(124,58,237,.12))" }}>
        <div className="flex items-center gap-2 mb-2">
          <CalendarCheck className="w-5 h-5 text-amber-300" />
          <p className="flex-1 min-w-0 text-base font-black italic">{t("hm.ci.title")}</p>
          <span className="text-xs font-bold text-amber-200">{t("hm.ci.dayOf", { n: s.done, total: s.cycleDays })}</span>
        </div>
        <div className="grid gap-1.5 mb-2" style={{ gridTemplateColumns: `repeat(${s.weekDays}, minmax(0, 1fr))` }}>
          {week.map((d) => <DayCell key={d} d={d} s={s} />)}
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1.5"><div className="h-full rounded-full" style={{ width: `${(s.done / s.cycleDays) * 100}%`, background: "linear-gradient(90deg,#f59e0b,#fde68a)" }} /></div>
        <p className="text-[11px] text-white/55 mb-2">{s.done >= s.cycleDays ? t("hm.ci.cycleDone") : t("hm.ci.toGo", { w: toWeek, b: s.cycleDays - s.done })}</p>
        <div className="flex gap-2">
          <button onClick={() => checkin.mutate()} disabled={s.checkedToday || checkin.isPending} className="arc-play arc-start flex-1 justify-center disabled:opacity-60" style={{ padding: 11, fontSize: 13 }}>
            {s.checkedToday ? t("hm.ci.doneToday") : t("hm.ci.checkIn", { n: s.nextDay || 1 })}
          </button>
          <button onClick={() => setShowAll(true)} className="rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-semibold text-white/75">{t("hm.ci.all30")}</button>
        </div>
      </div>

      {showAll && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setShowAll(false)}>
          <div className="relative w-full max-w-md rounded-3xl border border-amber-400/30 bg-[#170f2b] p-4 shadow-2xl dc-pop" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowAll(false)} aria-label={t("hm.ci.close")} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10"><X className="h-4 w-4" /></button>
            <p className="text-lg font-black pr-10 flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-amber-300" /> {t("hm.ci.title")}</p>
            <p className="text-xs text-white/55 mb-3">{s.resetOnMiss ? t("hm.ci.ruleReset") : t("hm.ci.ruleKeep")}</p>
            <div className="grid gap-1.5 mb-3" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
              {Array.from({ length: s.cycleDays }, (_, i) => <DayCell key={i} d={i + 1} s={s} />)}
            </div>
            <div className="space-y-1 mb-3 text-xs">
              {legend.map(([k, v]) => <div key={k} className="flex justify-between gap-2"><span className="text-white/55">{k}</span><b className="text-amber-200 text-right">{v}</b></div>)}
            </div>
            <button onClick={() => checkin.mutate()} disabled={s.checkedToday || checkin.isPending} className="arc-play arc-start w-full justify-center disabled:opacity-60" style={{ padding: 12, fontSize: 14 }}>
              {s.checkedToday ? t("hm.ci.doneToday") : t("hm.ci.checkIn", { n: s.nextDay || 1 })}
            </button>
          </div>
        </div>
      )}
      {won && <RewardShow won={won} onClose={() => setWon(null)} />}
    </>
  );
}

// Collects today's login reward by itself on the first app open of the day (any page).
let claimingDay = ""; // one attempt per day across page changes (the server also allows only one)
export function LoginRewardWatcher({ userId }: { userId?: string }) {
  const qc = useQueryClient();
  const [won, setWon] = useState<any>(null);
  const { data: s } = useQuery<State>({ queryKey: ["/api/reborn/daily-checkin"], queryFn: () => apiRequest("GET", "/api/reborn/daily-checkin").then((r) => r.json()), enabled: !!userId });
  useEffect(() => {
    if (!userId || !s?.enabled || !s.autoClaim || s.checkedToday || claimingDay === `${userId}:${s.today}`) return;
    claimingDay = `${userId}:${s.today}`;
    apiRequest("POST", "/api/reborn/daily-checkin", {}).then(async (r) => {
      const d = await r.json().catch(() => null);
      if (r.ok && d && !d.already) {
        setWon(d);
        if (d.milestone === "big") sfx.gift("fireworks"); else if (d.milestone === "week") sfx.rankUp(); else sfx.coin();
      }
      qc.invalidateQueries({ queryKey: ["/api/reborn/daily-checkin"] });
      qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }).catch(() => { claimingDay = ""; });
  }, [userId, s?.enabled, s?.autoClaim, s?.checkedToday, s?.today]);
  return won ? <RewardShow won={won} onClose={() => setWon(null)} /> : null;
}

function DayCell({ d, s }: { d: number; s: State }) {
  const { t } = useTranslation();
  const short = useShortReward();
  const got = d <= s.done;
  const isNext = !s.checkedToday && d === s.nextDay;
  const special = d === s.cycleDays ? "big" : d % s.weekDays === 0 ? "week" : "";
  return (
    <div className={`relative rounded-xl border px-0.5 py-1.5 text-center ${got ? "border-amber-400/60 bg-amber-400/20" : isNext ? "border-amber-300 bg-white/10 dc-next" : special ? "border-fuchsia-400/40 bg-fuchsia-500/10" : "border-white/10 bg-black/20"}`}>
      <div className={`text-base leading-none ${got ? "" : "opacity-70"}`}>{got ? "✅" : s.days[d - 1]?.type === "prize" ? "🎁" : dayIcon(d, s.cycleDays, s.weekDays)}</div>
      <div className="mt-1 text-[10px] font-bold text-white/70">{t("hm.ci.dayN", { n: d })}</div>
      <div className="truncate px-0.5 text-[9px] leading-tight text-amber-200/90">{short(s.days[d - 1])}</div>
    </div>
  );
}

// The reward animation: coins (any day), a gift box bursting open (every 7th day),
// a golden treasure chest with rays and confetti (day 30).
function RewardShow({ won, onClose }: { won: any; onClose: () => void }) {
  const { t } = useTranslation();
  const rewardText = useRewardText();
  const kind: "big" | "week" | "day" = won.milestone === "big" ? "big" : won.milestone === "week" ? "week" : "day";
  useEffect(() => { if (kind === "day") { const id = setTimeout(onClose, 2600); return () => clearTimeout(id); } }, [kind]);
  const pieces = Array.from({ length: kind === "day" ? 14 : 36 }, (_, i) => i);
  const head = kind === "big" ? t("hm.ci.bigWin") : kind === "week" ? t("hm.ci.weekWin") : t("hm.ci.dayWin", { n: won.day });
  const sub = t("hm.ci.loginDay", { n: won.day });
  return (
    <div className={`fixed inset-0 z-[95] flex items-center justify-center overflow-hidden p-4 ${kind === "day" ? "bg-black/55" : "bg-black/85"}`} onClick={onClose}>
      {kind !== "day" && <div className={`dc-rays ${kind === "big" ? "dc-rays-big" : ""}`} />}
      {pieces.map((i) => (
        <span key={i} className={kind === "day" ? "dc-coin" : "dc-confetti"} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 9) * 0.12}s`, ["--h" as any]: `${(i * 47) % 360}` }}>{kind === "day" ? "🪙" : ""}</span>
      ))}
      <div className="relative z-10 text-center dc-pop">
        <div className={kind === "big" ? "dc-chest" : kind === "week" ? "dc-box" : "dc-bounce"} style={{ fontSize: kind === "day" ? 64 : 96 }}>{kind === "big" ? "👑" : kind === "week" ? "🎁" : "✅"}</div>
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-white/60">{sub}</p>
        <p className={`mt-1 font-black tracking-wide ${kind === "big" ? "text-3xl dc-shine" : "text-2xl text-amber-200"}`}>{head}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {(won.rewards || []).map((r: any, i: number) => (
            <span key={i} className="dc-chip rounded-full border border-amber-300/60 bg-amber-400/20 px-3 py-1.5 text-sm font-bold text-amber-100" style={{ animationDelay: `${0.5 + i * 0.25}s` }}>
              {r.kind === "big" ? "👑 " : r.kind === "week" ? "🎁 " : "🪙 "}{rewardText(r)}
            </span>
          ))}
        </div>
        {(won.rewards || []).some((r: any) => r.type === "prize") && <p className="mt-2 text-xs text-white/60">{t("hm.ci.prizeWhere")}</p>}
        {kind !== "day" && <button onClick={onClose} className="arc-play arc-start mt-5 justify-center" style={{ padding: "10px 28px" }}>{t("hm.ci.collect")}</button>}
      </div>
    </div>
  );
}
