import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { useToast } from "@/hooks/use-toast";
import { PawPrint, Egg, HeartPulse, Pill, Clock, Check, Coins, Sofa, Shirt } from "lucide-react";
import petMale from "@assets/Doluruu Boy_1749664545355.png";
import petFemale from "@assets/doluruu-female-transparent.png";
import eggImg from "@assets/doluruu-blindbox-box.jpeg";
import { usePetBrand } from "@/hooks/usePetBrand";
import { ItemArt, COSTUME_FIT, PET_ART } from "@/components/pet-art";
import { PetRig, type RigFigure, type RigPose } from "@/components/PetRig";
import { useTranslation, translate, getCurrentLanguage, brandText } from "@/lib/i18n";
import { sfx } from "@/lib/sfx";

const WALK_CSS = `
/* No energy: the Sleep button glows and pulses so it's the obvious next tap */
.rwpet-nap{animation:rwpetNap 1.3s ease-in-out infinite;box-shadow:0 0 0 3px rgba(168,85,247,.55),0 0 22px rgba(168,85,247,.75)}
@keyframes rwpetNap{50%{transform:scale(1.06)}}
@media (prefers-reduced-motion: reduce){.rwpet-nap{animation:none}}
@keyframes rwpetWaddle{0%,100%{transform:translateY(0) rotate(-3deg)}25%{transform:translateY(-4%) rotate(0)}50%{transform:translateY(0) rotate(3deg)}75%{transform:translateY(-4%) rotate(0)}}
@keyframes rwpetShadowStep{0%,50%,100%{transform:translateX(-50%) scale(1);opacity:.32}25%,75%{transform:translateX(-50%) scale(.86);opacity:.24}}
@keyframes rwpetIdle{0%,100%{transform:scale(1,1)}50%{transform:scale(1.025,.975)}}
@keyframes rwpetHop{0%,100%{transform:translateY(0) scale(1,1)}15%{transform:translateY(0) scale(1.1,.88)}45%{transform:translateY(-26%) scale(.94,1.08)}75%{transform:translateY(0) scale(1.08,.92)}}
@keyframes rwpetLook{0%,100%{transform:rotate(0)}30%{transform:rotate(-7deg)}70%{transform:rotate(7deg)}}
@keyframes rwpetBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
@keyframes rwpetPop{0%{transform:scale(1) rotate(0)}35%{transform:scale(1.15) rotate(-6deg)}70%{transform:scale(.96) rotate(4deg)}100%{transform:scale(1) rotate(0)}}
@keyframes rwpetHeart{0%{transform:translate(-50%,0) scale(.6);opacity:0}20%{opacity:1}100%{transform:translate(-50%,-46px) scale(1.1);opacity:0}}
@keyframes rwpetCloud{0%{transform:translateX(-30px)}100%{transform:translateX(90px)}}
@keyframes rwpetTwinkle{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes rwpetBubble{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
.rwpet-walker{position:absolute;bottom:11%;width:34%;aspect-ratio:1;cursor:pointer;z-index:5;will-change:transform;}
.rwpet-shadow{position:absolute;left:50%;bottom:1%;width:56%;height:8%;transform:translateX(-50%);border-radius:50%;background:rgba(0,0,0,.32);filter:blur(3px);}
.rwpet-face{position:relative;width:100%;height:100%;transition:transform .28s ease;}
.rwpet-step{position:relative;width:100%;height:100%;transform-origin:50% 100%;}
.rwpet-m-walk .rwpet-step{animation:rwpetWaddle .8s ease-in-out infinite;}
.rwpet-m-walk .rwpet-shadow{animation:rwpetShadowStep .8s ease-in-out infinite;}
.rwpet-m-idle .rwpet-step{animation:rwpetIdle 2.2s ease-in-out infinite;}
.rwpet-m-look .rwpet-step{animation:rwpetLook 1.6s ease-in-out infinite;}
.rwpet-m-hop .rwpet-step{animation:rwpetHop .7s ease-out 2;}
.rwpet-pop{animation:rwpetPop .55s ease !important;}
.rwpet-sleep .rwpet-step{animation:rwpetBreathe 2.6s ease-in-out infinite;}
.rwpet-sleep img{filter:brightness(.85) saturate(.8);}
.rwpet-layer{max-width:none !important;height:auto !important;}
.rwpet-heart{position:absolute;left:50%;top:0;font-size:20px;animation:rwpetHeart 1s ease-out forwards;pointer-events:none;}
/* more moves: dance / spin / stretch / wave while wandering, and a reaction to every care action */
@keyframes rwpetDance{0%,100%{transform:translateX(0) rotate(0) scale(1,1)}20%{transform:translateX(-7%) rotate(-8deg) scale(1.03,.97)}40%{transform:translateX(0) rotate(0) translateY(-8%)}60%{transform:translateX(7%) rotate(8deg) scale(1.03,.97)}80%{transform:translateX(0) rotate(0) translateY(-8%)}}
@keyframes rwpetSpin{0%{transform:translateY(0) scaleX(1)}25%{transform:translateY(-14%) scaleX(0)}50%{transform:translateY(-18%) scaleX(-1)}75%{transform:translateY(-8%) scaleX(0)}100%{transform:translateY(0) scaleX(1)}}
@keyframes rwpetStretch{0%,100%{transform:scale(1,1)}35%{transform:scale(.92,1.14)}65%{transform:scale(1.1,.9)}}
@keyframes rwpetWave{0%,100%{transform:rotate(0)}20%{transform:rotate(-6deg) translateY(-3%)}40%{transform:rotate(6deg)}60%{transform:rotate(-6deg) translateY(-3%)}80%{transform:rotate(6deg)}}
@keyframes rwpetChomp{0%,100%{transform:scale(1,1)}25%{transform:scale(1.06,.93)}50%{transform:scale(.97,1.04)}75%{transform:scale(1.06,.93)}}
@keyframes rwpetShake{0%,100%{transform:translateX(0) rotate(0)}15%{transform:translateX(-4%) rotate(-5deg)}30%{transform:translateX(4%) rotate(5deg)}45%{transform:translateX(-4%) rotate(-5deg)}60%{transform:translateX(4%) rotate(5deg)}75%{transform:translateX(-2%) rotate(-2deg)}}
@keyframes rwpetDroop{0%,100%{transform:scale(1,.97) rotate(-2deg) translateY(1%)}50%{transform:scale(1,.95) rotate(2deg) translateY(2%)}}
@keyframes rwpetFoodIn{0%{transform:translate(0,-46px) scale(.6) rotate(-25deg);opacity:0}25%{opacity:1}75%{transform:translate(0,38px) scale(1) rotate(8deg);opacity:1}100%{transform:translate(0,46px) scale(.3);opacity:0}}
@keyframes rwpetFloatUp{0%{transform:translate(0,0) scale(.5);opacity:0}15%{opacity:1}100%{transform:translate(var(--dx,0px),-84px) scale(1.1);opacity:0}}
@keyframes rwpetScrub{0%,100%{transform:translateX(-14px) rotate(-20deg)}50%{transform:translateX(14px) rotate(20deg)}}
@keyframes rwpetBall{0%{transform:translate(70px,0)}25%{transform:translate(35px,-34px)}50%{transform:translate(0,0)}75%{transform:translate(-35px,-24px)}100%{transform:translate(-70px,0);opacity:0}}
@keyframes rwpetSparkle{0%,100%{transform:scale(0) rotate(0);opacity:0}50%{transform:scale(1) rotate(90deg);opacity:1}}
@keyframes rwpetRain{0%{transform:translateY(-4px);opacity:0}30%{opacity:.9}100%{transform:translateY(22px);opacity:0}}
@keyframes rwpetBubbleIn{0%{opacity:0;transform:translateX(-50%) translateY(6px) scale(.9)}100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
.rwpet-m-dance .rwpet-step{animation:rwpetDance 1.15s ease-in-out 2;}
.rwpet-m-spin .rwpet-step{animation:rwpetSpin 1s ease-in-out 1;}
.rwpet-m-stretch .rwpet-step{animation:rwpetStretch 1.4s ease-in-out 1;}
.rwpet-m-wave .rwpet-step{animation:rwpetWave 1.5s ease-in-out 1;}
.rwpet-m-idle.rwpet-mood-sad .rwpet-step{animation:rwpetDroop 3s ease-in-out infinite;}
.rwpet-m-idle.rwpet-mood-happy .rwpet-step{animation:rwpetIdle 1.5s ease-in-out infinite;}
.rwpet-fx-feed .rwpet-step{animation:rwpetChomp .42s ease-in-out 1s 5;}
.rwpet-fx-clean .rwpet-step{animation:rwpetShake .6s ease-in-out 4;}
.rwpet-fx-play .rwpet-step{animation:rwpetHop .6s ease-out 4;}
.rwpet-fx-sleep .rwpet-step{animation:rwpetStretch 1.8s ease-in-out 1;}
.rwpet-fx-wake .rwpet-step{animation:rwpetStretch 1.4s ease-in-out 1;}
.rwpet-fx-poke-0 .rwpet-step{animation:rwpetPop .55s ease 1;}
.rwpet-fx-poke-1 .rwpet-step{animation:rwpetHop .7s ease-out 1;}
.rwpet-fx-poke-2 .rwpet-step{animation:rwpetSpin .8s ease-in-out 1;}
.rwpet-fx-poke-3 .rwpet-step{animation:rwpetShake .5s ease-in-out 1;}
.rwpet-fx{position:absolute;pointer-events:none;line-height:1;z-index:12;}
/* the cartoon puppet (PetRig) moves the body itself: no flat-picture bobbing on top */
.rwpet-rigged .rwpet-step{animation:none !important;}
.rwpet-rigged .rwpet-face{transition:none;} /* turning around is instant, like a cartoon — never squeezed through paper-thin */
@media (prefers-reduced-motion:reduce){.rwpet-walker .rwpet-step,.rwpet-shadow{animation:none !important}.rwpet-fx{display:none}}
`;

const STAT_META: Record<string, { label: string; color: string; emoji: string }> = {
  hunger: { label: "hm.pet.statHunger", color: "#f59e0b", emoji: "🍖" },
  happiness: { label: "hm.pet.statJoy", color: "#ec4899", emoji: "🎾" },
  cleanliness: { label: "hm.pet.statClean", color: "#38bdf8", emoji: "🧼" },
  energy: { label: "hm.pet.statEnergy", color: "#22c55e", emoji: "⚡" },
};

export default function RebornPet() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [code, setCode] = useState("");

  const { data: pets = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/reborn/pets"],
    queryFn: () => apiRequest("GET", "/api/reborn/pets").then((r) => r.json()),
    refetchInterval: 60000,
  });
  const { data: pills } = useQuery<{ available: number }>({
    queryKey: ["/api/reborn/pills"],
    queryFn: () => apiRequest("GET", "/api/reborn/pills").then((r) => r.json()),
    refetchInterval: 15000, refetchOnWindowFocus: true,
  });
  const { data: home } = useQuery<any>({
    queryKey: ["/api/reborn/pet-home"],
    queryFn: () => apiRequest("GET", "/api/reborn/pet-home").then((r) => r.json()),
    refetchInterval: 30000,
  });
  const homeCall = useMutation({
    mutationFn: (v: { path: string; body: any }) => apiRequest("POST", `/api/reborn/pet-home/${v.path}`, v.body).then((r) => r.json()),
    onSuccess: (d) => { qc.setQueryData(["/api/reborn/pet-home"], d); if (d.message) toast({ title: d.message }); },
    onError: (e: any) => toast({ title: t("hm.pet.cantDo"), description: e.message, variant: "destructive" }),
  });
  // Doluruu greets you when Pet Care opens (once per visit to the page).
  useEffect(() => { const lang = getCurrentLanguage(); sfx.welcome(translate("hm.pet.voiceWelcome", {}, lang), lang); }, []);
  // Each care button has its own sound, played on the tap.
  const actionSound = (action: string) => {
    const lang = getCurrentLanguage();
    if (action === "feed") sfx.yummy();
    else if (action === "clean") sfx.scrub();
    else if (action === "play") sfx.playFun();
    else if (action === "sleep") sfx.sweetDreams(translate("hm.pet.voiceSweetDreams", {}, lang), lang);
    else if (action === "wake") sfx.wakeUp();
  };
  const setLight = (on: boolean) => {
    sfx.lightSwitch();
    qc.setQueryData(["/api/reborn/pet-home"], (h: any) => h && { ...h, lightOn: on }); // flip instantly
    homeCall.mutate({ path: "light", body: { on } });
  };
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["/api/reborn/pets"] });
    qc.invalidateQueries({ queryKey: ["/api/reborn/pills"] });
    qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
    qc.invalidateQueries({ queryKey: ["/api/reborn/badges"] }); // care given → fewer pet alerts
  };

  const activate = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/activate", { code: code.trim() }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: t("hm.pet.activated"), description: d.message }); setCode(""); refresh(); },
    onError: (e: any) => toast({ title: t("hm.pet.couldntActivate"), description: e.message, variant: "destructive" }),
  });
  const act = useMutation({
    mutationFn: (v: { petId: number; action: string }) => apiRequest("POST", "/api/reborn/action", v).then((r) => r.json()),
    onSuccess: (d) => { if (d.tokenAwarded) toast({ title: t("hm.pet.tokenEarned"), description: d.message }); refresh(); },
    onError: (e: any) => toast({ title: t("hm.pet.cantDo"), description: e.message, variant: "destructive" }),
  });
  const usePill = useMutation({
    mutationFn: (petId: number) => apiRequest("POST", "/api/reborn/use-pill", { petId }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: t("hm.pet.revived"), description: d.message }); refresh(); },
    onError: (e: any) => toast({ title: t("hm.pet.cantRevive"), description: e.message, variant: "destructive" }),
  });

  const canAddMore = pets.filter((p) => p.lifeStatus !== "dead").length < 2;

  return (
    <RebornLayout active="/pet" title={t("hm.pet.pageTitle")}>
      <style dangerouslySetInnerHTML={{ __html: WALK_CSS }} />

      {canAddMore && (
        <div className="arc-panel mb-4" style={{ ["--c1" as any]: "#fb7185" }}>
          <div className="flex items-center gap-2 mb-2"><PawPrint className="w-5 h-5 text-rose-400" /><h2 className="arc-title" style={{ fontSize: 16 }}>{t("hm.pet.activateTitle")}</h2></div>
          <p className="text-sm text-white/60 mb-3">{t("hm.pet.activateDesc")}</p>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="RW-XXXXXX"
              className="arc-input arc-input-code flex-1" style={{ width: "auto", letterSpacing: ".18em" }} />
            <button onClick={() => activate.mutate()} disabled={!code.trim() || activate.isPending} className="arc-play shrink-0 px-5 disabled:opacity-50" style={{ fontSize: 13 }}>
              {activate.isPending ? "..." : t("hm.pet.activate")}
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-white/50 text-center py-8">{t("hm.pet.loading")}</p>}
      {!isLoading && pets.length === 0 && (
        <div className="text-center py-10 text-white/50"><PawPrint className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{t("hm.pet.noPets")}</p></div>
      )}

      <div className="space-y-4">
        {pets.map((pet) => (
          <PetCard key={pet.id} pet={pet}
            onAction={(action: string, onOk?: () => void) => { actionSound(action); act.mutate({ petId: pet.id, action }, { onSuccess: () => onOk?.() }); }} busy={act.isPending}
            onPill={() => usePill.mutate(pet.id)} pilling={usePill.isPending} pillsAvailable={pills?.available || 0}
            home={home} onLight={setLight} />
        ))}
      </div>

      {home && pets.some((p) => !p.isEgg) && (
        <PetShop home={home} pets={pets.filter((p) => !p.isEgg)} busy={homeCall.isPending}
          onBuy={(itemId: string, onOk?: () => void) => homeCall.mutate({ path: "buy", body: { itemId } }, { onSuccess: () => onOk?.() })}
          onPlace={(slot: string, itemId: string | null) => homeCall.mutate({ path: "place", body: { slot, itemId } })}
          onWear={(petId: number, itemId: string) => homeCall.mutate({ path: "wear", body: { petId, itemId } })} />
      )}
    </RebornLayout>
  );
}

function PetCard({ pet, onAction, busy, onPill, pilling, pillsAvailable, home, onLight }: any) {
  const { t } = useTranslation();
  const petBrand = usePetBrand();
  const img = pet.isEgg ? petBrand.eggImageUrl || eggImg : petBrand.imageUrl || (pet.gender === "female" ? petFemale : petMale);
  const sick = pet.lifeStatus === "sick";
  // Every care action makes the pet react in the room (eat / splash / play / yawn / stretch) once it worked.
  const [careFx, setCareFx] = useState<{ kind: string; n: number } | null>(null);
  const { toast } = useToast();
  // No energy left: feed / play / clean would only be refused, so the pet yawns and asks for a nap instead.
  const tired = !pet.isEgg && !pet.isSleeping && Number(pet.energy) <= 0;
  const doAction = (a: string) => {
    if (tired && a !== "sleep") {
      setCareFx({ kind: "tired", n: Date.now() });
      toast({ title: t("hm.pet.noEnergy"), description: t("hm.pet.noEnergyDesc") });
      return;
    }
    onAction(a, () => setCareFx({ kind: a, n: Date.now() }));
  };

  return (
    <div className="arc-panel" style={{ padding: 0, ["--c1" as any]: pet.isEgg ? "#fb7185" : sick ? "#ef4444" : "#f472b6" }}>
      {/* header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <h3 className="arc-title">{brandText(pet.name)}</h3>
          {pet.isEgg ? <Badge color="#fb7185"><Egg className="w-3 h-3" /> {t("hm.pet.egg")}</Badge>
            : sick ? <Badge color="#ef4444"><HeartPulse className="w-3 h-3" /> {t("hm.pet.sick")}</Badge>
            : <Badge color="#22c55e"><Check className="w-3 h-3" /> {t("hm.pet.healthy")}</Badge>}
        </div>
        {!pet.isEgg && <span className="arc-badge" style={{ marginTop: 0 }}><Clock className="w-3 h-3" /> {t("hm.pet.daysLeftShort", { n: pet.daysLeft })}</span>}
      </div>

      <PetRoom pet={pet} img={img} sick={sick} home={home} onLight={onLight} careFx={careFx} />
      {!pet.isEgg && <OutfitCard pet={pet} home={home} />}

      {/* body */}
      <div className="p-4">
        {pet.isEgg ? (
          <p className="text-sm text-white/60 text-center">{t("hm.pet.eggDesc")}</p>
        ) : sick ? (
          <>
            <p className="text-sm text-white/60 mb-3">{t("hm.pet.sickDesc")}</p>
            <button onClick={onPill} disabled={pilling || pillsAvailable < 1} className="pet-act w-full" style={{ flexDirection: "row", gap: 8, padding: "12px 8px", ["--c" as any]: pillsAvailable > 0 ? "#ef4444" : "#64748b" }}>
              <Pill className="w-4 h-4" /> {pillsAvailable > 0 ? t("hm.pet.usePill") : t("hm.pet.noPill")}
            </button>
          </>
        ) : (
          <>
            {/* stat bars */}
            <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              {(["hunger", "happiness", "cleanliness", "energy"] as const).map((k) => {
                const v = pet[k] ?? 0; const m = STAT_META[k];
                const c = v < 20 ? "#ef4444" : v < 50 ? "#f59e0b" : m.color;
                return (
                  <div key={k} className="pet-stat" style={{ ["--c1" as any]: c }}>
                    <div className="flex justify-between text-[11px]"><span className="font-bold text-white/75 truncate">{m.emoji} {t(m.label)}</span><span className="font-black" style={{ color: c, textShadow: `0 0 8px ${c}` }}>{v}%</span></div>
                    <div className="arc-bar"><i className="transition-all" style={{ width: `${v}%` }} /></div>
                  </div>
                );
              })}
            </div>

            {/* actions */}
            <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
              {[
                { a: "feed", label: t("hm.pet.feed"), emoji: "🍖", c: "#f59e0b" },
                { a: "play", label: t("hm.pet.play"), emoji: "🎾", c: "#22c55e" },
                { a: "clean", label: t("hm.pet.clean"), emoji: "🧼", c: "#38bdf8" },
                { a: pet.isSleeping ? "wake" : "sleep", label: pet.isSleeping ? t("hm.pet.wake") : t("hm.pet.sleep"), emoji: pet.isSleeping ? "☀️" : "😴", c: "#a855f7" },
              ].map((b) => (
                <button key={b.a} onClick={() => doAction(b.a)} disabled={busy || (b.a === "feed" && !pet.canFeed)}
                  className={`pet-act${tired ? (b.a === "sleep" ? " rwpet-nap" : " opacity-50") : ""}`} style={{ ["--c" as any]: b.c }}>
                  <span className="e">{b.emoji}</span><span className="l">{b.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-white/35 text-center mt-2.5">{t("hm.pet.energyHelp")}</p>

            {/* daily token timer */}
            <div className="mt-3 rounded-2xl p-3 border border-amber-300/25" style={{ background: "linear-gradient(100deg, rgba(243,181,47,.14), rgba(0,0,0,.3) 60%)" }}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-white/60 flex items-center gap-1"><Coins className="w-3 h-3 text-amber-400" /> {t("hm.pet.dailyToken")}</span>
                {pet.tokenEarnedToday ? <span className="text-emerald-400 font-bold">{t("hm.pet.earned")}</span>
                  : pet.cycleActive ? <span className="text-amber-300 font-bold">⏳ {t("hm.pet.hoursLeft", { n: pet.cycleHoursLeft })}</span>
                  : <span className="text-white/40">{t("hm.pet.feedToStart")}</span>}
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: pet.feedsNeeded }).map((_, i) => (
                  <div key={i} className={`pet-seg ${i < pet.feedsInCycle ? "on" : ""}`} />
                ))}
              </div>
              <p className="text-[11px] text-white/40 mt-1.5">
                {pet.tokenEarnedToday ? t("hm.pet.tokenClaimed", { n: pet.cycleHoursLeft })
                  : pet.nextFeedMinutes > 0 ? t("hm.pet.notHungry", { time: pet.nextFeedMinutes >= 60 ? t("hm.unit.hours", { n: Math.ceil(pet.nextFeedMinutes / 60) }) : t("hm.unit.minutes", { n: pet.nextFeedMinutes }), fed: pet.feedsInCycle, need: pet.feedsNeeded })
                  : t("hm.pet.feedNow", { fed: pet.feedsInCycle, need: pet.feedsNeeded })}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Badge({ children, color }: any) {
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${color}22`, color }}>{children}</span>;
}

// ── Pet room ─────────────────────────────────────────────────────────────
type Phase = "dawn" | "day" | "dusk" | "night";
// Hour in the venue's time zone, re-read every minute so day turns to night live.
function useVenueHour(tz?: string) {
  const read = () => { try { return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: tz || undefined }).format(new Date())); } catch { return new Date().getHours(); } };
  const [h, setH] = useState(read);
  useEffect(() => { setH(read()); const t = setInterval(() => setH(read()), 60000); return () => clearInterval(t); }, [tz]);
  return h;
}
const phaseOf = (h: number): Phase => (h >= 6 && h < 8 ? "dawn" : h >= 8 && h < 17 ? "day" : h >= 17 && h < 19 ? "dusk" : "night");
const SKY: Record<Phase, string> = {
  dawn: "linear-gradient(180deg,#ffb88c 0%,#ffd6a5 55%,#fff1c1 100%)",
  day: "linear-gradient(180deg,#5ec3ff 0%,#9edcff 60%,#d6f1ff 100%)",
  dusk: "linear-gradient(180deg,#5b3a8c 0%,#e8698a 55%,#ffb36b 100%)",
  night: "linear-gradient(180deg,#0b1030 0%,#1b2356 70%,#2a2f6b 100%)",
};
const WALL: Record<Phase, string> = {
  dawn: "linear-gradient(180deg,#ffe8d9,#ffd9c7)",
  day: "linear-gradient(180deg,#fff4e6,#ffe7cf)",
  dusk: "linear-gradient(180deg,#f6d4d8,#e9c0cf)",
  night: "linear-gradient(180deg,#f3e3d3,#e7d2bf)",
};
const itemById = (home: any, id?: string) => (home?.catalog || []).find((i: any) => i.id === id);

type Mood = "happy" | "ok" | "sad";
const petMood = (pet: any): Mood => {
  const st = ["hunger", "happiness", "cleanliness", "energy"].map((k) => pet[k] ?? 0);
  const avg = st.reduce((a: number, b: number) => a + b, 0) / 4;
  return Math.min(...st) < 20 || avg < 35 ? "sad" : avg >= 65 ? "happy" : "ok";
};
// How long each reaction holds the pet in place, and the line it says after a care action.
const FX_MS: Record<string, number> = { feed: 2600, clean: 2800, play: 2400, sleep: 1900, wake: 1700, poke: 1000 };
const CARE_SAY: Record<string, string> = { feed: "hm.pet.say.fed", clean: "hm.pet.say.cleaned", play: "hm.pet.say.played", sleep: "hm.pet.say.sleep", wake: "hm.pet.say.wake" };
const NEED_SAY = ["hm.pet.say.hungry", "hm.pet.say.bored", "hm.pet.say.dirty", "hm.pet.say.sleepy"];
// Little emoji that fly around the pet during a reaction (positions are % of the pet's box).
type Part = { e: string; l: number; t: number; s: number; dx: number; a: string };
function fxParts(kind: string, v = 0): Part[] {
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const up = (e: string, l: number, t: number, d: number, dx = 0, s = 20, dur = 1.4): Part => ({ e, l, t, s, dx, a: `rwpetFloatUp ${dur}s ease-out ${d}s both` });
  const sparkle = (l: number, t: number, d: number): Part => ({ e: "✨", l, t, s: 22, dx: 0, a: `rwpetSparkle .8s ease-in-out ${d}s 1 both` });
  if (kind === "feed") {
    const food = ["🍖", "🍗", "🍎", "🥕"][Math.floor(Math.random() * 4)];
    return [{ e: food, l: 52, t: 4, s: 30, dx: 0, a: "rwpetFoodIn .95s ease-in both" }, ...[0, 1, 2, 3, 4].map((i) => up(["💛", "✨", "😋", "💛", "✨"][i], rnd(30, 70), 30, 1 + i * 0.18, rnd(-18, 18)))];
  }
  if (kind === "clean") {
    return [{ e: "🧼", l: 46, t: 40, s: 30, dx: 0, a: "rwpetScrub .5s ease-in-out 5 both" },
      ...Array.from({ length: 8 }, (_, i) => up("🫧", rnd(15, 85), rnd(45, 85), i * 0.2, rnd(-10, 10), rnd(16, 26), 1.8)),
      ...[0, 1, 2].map((i) => sparkle(rnd(25, 75), rnd(15, 60), 2 + i * 0.15))];
  }
  if (kind === "play") {
    return [{ e: "🎾", l: 60, t: 78, s: 26, dx: 0, a: "rwpetBall 1.7s ease-in-out both" },
      ...[0, 1, 2].map((i) => up("🎵", rnd(25, 75), 20, 0.3 + i * 0.4, rnd(-14, 14), 20, 1.6)), up("🎉", 50, 10, 1.4, 0, 22, 1.2)];
  }
  if (kind === "sleep") return [up("🌙", 70, 12, 0, 0, 24, 1.8), ...[0, 1, 2].map((i) => up("💤", 55 + i * 8, 18, 0.3 + i * 0.45, 6, 16 + i * 5, 1.8))];
  if (kind === "wake") return [up("☀️", 50, 6, 0, 0, 26, 1.6), ...[0, 1, 2, 3].map((i) => sparkle(rnd(20, 80), rnd(10, 60), 0.3 + i * 0.2))];
  return Array.from({ length: 1 + (v % 3) }, (_, i) => up(["💖", "💕", "💗"][i % 3], rnd(35, 65), 12, i * 0.12, rnd(-16, 16), 20, 1.1)); // poke
}

function PetRoom({ pet, img, sick, home, onLight, careFx }: any) {
  const { t } = useTranslation();
  const phase = phaseOf(useVenueHour(home?.timezone));
  const dark = phase === "night" || phase === "dusk";
  const lightOn = home?.lightOn ?? true;
  // Night + light off → dim room; light on → warm glow. Daytime is naturally bright.
  const dim = dark ? (lightOn ? 0.12 : 0.62) : lightOn ? 0 : 0.18;
  const placed = home?.placed || {};
  const worn: Record<string, string> = home?.costumes?.[String(pet.id)] || {};
  const slot = (s: string) => itemById(home, placed[s]);
  const asleep = pet.isSleeping || sick;
  const mood = petMood(pet);
  const wander = useWander(!asleep && !pet.isEgg, mood);
  // The cartoon puppet; falls back to the still picture if the phone can't draw it (no WebGL).
  const [rigOk, setRigOk] = useState(true);
  const ownPicture = usePetBrand().imageUrl;
  // Doluruu walks in its clothing (shirtless by default) with its footwear on top
  // (barefoot by default); both are layers on the same canvas.
  const layers = outfitLayers(home, worn);
  const stats = ["hunger", "happiness", "cleanliness", "energy"].map((k) => pet[k] ?? 0);
  const lowest = Math.min(...stats);
  const need = lowest >= 30 ? null : ["🍖", "🎾", "🧼", "😴"][stats.indexOf(lowest)];
  const moodEmoji = mood === "happy" ? "😊" : mood === "sad" ? "😢" : null;

  // ── a reaction (fx) + a speech bubble (line): care actions, taps, greetings and idle chatter ──
  const [fx, setFx] = useState<{ kind: string; n: number; v: number } | null>(null);
  const [line, setLine] = useState<{ text: string; k: number } | null>(null);
  const timers = useRef<Record<string, any>>({});
  const pokes = useRef({ n: 0, at: 0 });
  const say = (key: string, vars?: any) => { clearTimeout(timers.current.say); setLine({ text: t(key, vars), k: Date.now() }); timers.current.say = setTimeout(() => setLine(null), 3800); };
  const sayRef = useRef(say); sayRef.current = say;
  const startFx = (kind: string, v = 0) => {
    clearTimeout(timers.current.fx);
    setFx({ kind, n: Date.now(), v });
    wander.api.current?.hold(FX_MS[kind] || 1500);
    timers.current.fx = setTimeout(() => setFx(null), FX_MS[kind] || 1500);
  };
  useEffect(() => () => { Object.values(timers.current).forEach((x) => clearTimeout(x)); }, []);
  // The care button worked → eat / splash / play / yawn / stretch, and say thanks.
  useEffect(() => {
    if (!careFx) return;
    if (careFx.kind === "tired") { startFx("sleep"); say("hm.pet.say.tooTired"); return; } // yawns, asks for a nap
    startFx(careFx.kind); say(CARE_SAY[careFx.kind]);
  }, [careFx?.n]);
  // Greets you when the room opens, then chats now and then (needs first, then mood, then tips).
  const live = useRef<any>({});
  live.current = { stats, asleep, mood, phase, pet };
  useEffect(() => {
    if (pet.isEgg) return;
    const chat = (greet: boolean) => {
      const s = live.current; if (s.asleep) return;
      const low = Math.min(...s.stats);
      if (low < 30) return sayRef.current(NEED_SAY[s.stats.indexOf(low)]);
      if (greet) return sayRef.current(s.phase === "dawn" ? "hm.pet.say.morning" : s.phase === "night" ? "hm.pet.say.night" : Math.random() < 0.5 ? "hm.pet.say.hello1" : "hm.pet.say.hello2");
      const pool = s.mood === "sad" ? ["hm.pet.say.lonely", "hm.pet.say.tipFloor"] : s.mood === "happy" ? ["hm.pet.say.happy1", "hm.pet.say.happy2", "hm.pet.say.tipFloor", "hm.pet.say.tipLight"] : ["hm.pet.say.tipFloor", "hm.pet.say.tipLight", "hm.pet.say.hello2"];
      if (!s.pet.tokenEarnedToday && s.pet.feedsNeeded) pool.push("hm.pet.say.tipToken");
      sayRef.current(pool[Math.floor(Math.random() * pool.length)], { n: s.pet.feedsNeeded });
    };
    const first = setTimeout(() => chat(true), 1400), iv = setInterval(() => chat(false), 17000);
    return () => { clearTimeout(first); clearInterval(iv); };
  }, [pet.isEgg, pet.id]);
  // Tap the pet: a random reaction + a line (free — no energy cost); many taps in a row make it extra happy.
  const poke = (e: any) => {
    e.stopPropagation(); sfx.poke();
    const now = Date.now(), p = pokes.current;
    p.n = now - p.at < 6000 ? p.n + 1 : 1; p.at = now;
    startFx("poke", p.n % 4);
    if (sick) return say("hm.pet.say.sickPoke");
    if (asleep) return say("hm.pet.say.sleepPoke");
    say(p.n >= 6 ? "hm.pet.say.pokeMany" : `hm.pet.say.poke${(p.n % 5) + 1}`);
  };
  // Tap the floor / room: the pet runs over to you.
  const callPet = (e: any) => {
    if (asleep || pet.isEgg) return;
    const r = e.currentTarget.getBoundingClientRect();
    clearTimeout(timers.current.fx); setFx(null);
    wander.api.current?.goTo(Math.max(2, Math.min(62, ((e.clientX - r.left) / r.width) * 100 - 17)));
    say("hm.pet.say.coming");
  };
  const parts = useMemo(() => (fx ? fxParts(fx.kind, fx.v) : []), [fx?.n]);
  const fxCls = fx ? (fx.kind === "poke" ? `rwpet-fx-poke-${fx.v}` : `rwpet-fx-${fx.kind}`) : "";
  const rigPose: RigPose = (fx ? (fx.kind === "poke" ? `poke-${fx.v}` : fx.kind === "sleep" ? "yawn" : fx.kind) : asleep ? "sleep" : wander.mode) as RigPose;
  const rigFigure = useMemo<RigFigure>(() => ownPicture ? { cw: 0, ch: 0, layers: [{ src: ownPicture, x: 0, y: 0, w: 0, h: 0 }], eyes: null }
    : layers ? figureSpec(home, worn, pet.gender) : figureSpec(undefined, {}, pet.gender), [ownPicture, JSON.stringify(layers), JSON.stringify(worn), pet.gender, home?.baseEyes]);
  const bubbleLeft = Math.max(30, Math.min(70, (asleep ? 36 : wander.xRef.current) + 17));

  return (
    <div onClick={callPet} className="relative mx-3 mt-3 rounded-2xl overflow-hidden aspect-[4/3] select-none" style={{ background: WALL[phase] }}>
      {/* wallpaper stripes */}
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,.55) 0 14px, transparent 14px 28px)" }} />
      {/* window with the real sky for the venue's time */}
      <div className="absolute left-[7%] top-[9%] w-[30%] aspect-[5/4] rounded-lg overflow-hidden border-[5px] border-white shadow-md" style={{ background: SKY[phase] }}>
        {phase === "night" && ["12% 20%", "62% 16%", "38% 52%", "78% 58%", "22% 72%"].map((pos, i) => (
          <span key={i} className="absolute text-[8px] text-white" style={{ left: pos.split(" ")[0], top: pos.split(" ")[1], animation: `rwpetTwinkle ${1.6 + i * 0.4}s ease-in-out infinite` }}>✦</span>
        ))}
        <span className="absolute text-xl" style={phase === "night" ? { right: "10%", top: "8%" } : phase === "day" ? { right: "12%", top: "10%" } : { right: "38%", bottom: "4%" }}>{phase === "night" ? "🌙" : "☀️"}</span>
        {phase === "day" && <span className="absolute top-[42%] left-0 text-base" style={{ animation: "rwpetCloud 14s linear infinite" }}>☁️</span>}
        <div className="absolute left-1/2 top-0 bottom-0 w-[4px] -translate-x-1/2 bg-white" /><div className="absolute top-1/2 left-0 right-0 h-[4px] -translate-y-1/2 bg-white" />
      </div>
      {/* curtains */}
      <div className="absolute left-[4%] top-[6%] w-[6%] h-[42%] rounded-b-xl" style={{ background: "linear-gradient(90deg,#f28ab2,#f7b3cd)" }} />
      <div className="absolute left-[34%] top-[6%] w-[6%] h-[42%] rounded-b-xl" style={{ background: "linear-gradient(90deg,#f7b3cd,#f28ab2)" }} />
      <div className="absolute left-[3%] top-[5%] w-[38%] h-[3%] rounded-full bg-[#b07a4f]" />

      {/* ceiling lamp + wall switch */}
      <div className="absolute left-[58%] top-0 w-[2px] h-[10%] bg-[#6b4f3a]" />
      <div className="absolute left-[58%] top-[9%] -translate-x-1/2 w-9 h-5 rounded-t-full" style={{ background: lightOn ? "#ffd86b" : "#c9b8a0", boxShadow: lightOn ? "0 10px 40px 18px rgba(255,214,107,.45)" : "none" }} />
      <button onClick={(e) => { e.stopPropagation(); onLight?.(!lightOn); }} aria-label={lightOn ? t("hm.pet.lightOffAria") : t("hm.pet.lightOnAria")}
        className="absolute right-[3%] top-[30%] z-10 flex flex-col items-center justify-center gap-0.5 rounded-lg border border-black/10 bg-white shadow-md"
        style={{ width: 34, height: 48 }}>
        <span style={{ fontSize: 14, lineHeight: 1, filter: lightOn ? "none" : "grayscale(1) opacity(.5)" }}>💡</span>
        <span className="rounded-sm transition-all" style={{ width: 10, height: 14, background: lightOn ? "#22c55e" : "#64748b", transform: lightOn ? "translateY(-2px)" : "translateY(2px)" }} />
      </button>

      {/* wall art slot */}
      {slot("art") && <ItemArt id={slot("art").id} emoji={slot("art").emoji} className="absolute drop-shadow-md" style={{ right: "13%", top: "8%", width: "20%", aspectRatio: "1" }} />}

      {/* wooden floor */}
      <div className="absolute inset-x-0 bottom-0 h-[26%]" style={{ background: "repeating-linear-gradient(90deg,#c98f5a 0 38px,#bf8450 38px 40px)", borderTop: "6px solid #8a5a33" }} />
      <div className="absolute left-1/2 -translate-x-1/2 bottom-[6%] w-[46%] h-[11%] rounded-[50%]" style={{ background: "radial-gradient(ellipse,#f6c1d6 0 55%,#e89ab8 56% 70%,transparent 71%)" }} />

      {/* floor slots */}
      {slot("lamp") && <ItemArt id={slot("lamp").id} emoji={slot("lamp").emoji} className="absolute" style={{ left: "-1%", bottom: "13%", width: "17%", aspectRatio: "1" }} />}
      {slot("sofa") && <ItemArt id={slot("sofa").id} emoji={slot("sofa").emoji} className="absolute" style={{ left: "9%", bottom: "8%", width: "38%", aspectRatio: "1" }} />}
      {slot("toy") && <ItemArt id={slot("toy").id} emoji={slot("toy").emoji} className="absolute" style={{ left: "63%", bottom: "4%", width: "13%", aspectRatio: "1" }} />}
      {slot("plant") && <ItemArt id={slot("plant").id} emoji={slot("plant").emoji} className="absolute" style={{ right: "0%", bottom: "13%", width: "21%", aspectRatio: "1" }} />}

      {pet.isEgg ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
          <img src={img} alt={t("hm.pet.eggAlt")} className="w-28 h-28 object-contain rounded-xl" style={{ animation: "rwpetBreathe 2.4s ease-in-out infinite" }} />
          <p className="text-xs text-white flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" /> {t("hm.pet.hatchesIn", { n: pet.hatchDaysLeft })}</p>
        </div>
      ) : (
        <button ref={wander.ref} onClick={poke} className={`rwpet-walker ${fxCls || (asleep ? "rwpet-sleep" : `rwpet-m-${wander.mode}`)} rwpet-mood-${mood} ${rigOk ? "rwpet-rigged" : ""}`} style={{ left: `${asleep ? 36 : wander.startX}%` }} aria-label={t("hm.pet.playAria")}>
          <div className="rwpet-shadow" />
          <div className="rwpet-face" style={{ transform: `scaleX(${wander.facing})` }}>
            <div className="rwpet-step">
              {rigOk
                ? <PetRig figure={rigFigure} pose={rigPose} mood={mood} onFail={() => setRigOk(false)} tone={sick ? "sick" : pet.isSleeping ? "sleep" : ""} />
                : layers
                ? <DressedPet home={home} worn={worn} alt={pet.name} gender={pet.gender} className={sick ? "grayscale opacity-70" : ""} />
                : <img src={img} alt={pet.name} className={`w-full h-full object-contain object-bottom ${sick ? "grayscale opacity-70" : ""}`} draggable={false} />}
              {(["neck", "face", "head"] as const).map((part) => {
                const it = worn[part] && itemById(home, worn[part]);
                if (!it || !PET_ART[it.id] || layers) return null; // drawn legacy costumes only
                const f = COSTUME_FIT[part];
                return <ItemArt key={part} id={it.id} emoji={it.emoji} className="absolute pointer-events-none"
                  style={{ left: `${f.left}%`, top: `${f.top}%`, width: `${f.width}%`, aspectRatio: "1", transform: `translate(-50%, ${f.anchor === "bottom" ? "-100%" : "-50%"})`, filter: "drop-shadow(0 2px 2px rgba(0,0,0,.25))" }} />;
              })}
            </div>
          </div>
          {parts.map((p, i) => <span key={`${fx?.n}-${i}`} className="rwpet-fx" style={{ left: `${p.l}%`, top: `${p.t}%`, fontSize: p.s, animation: p.a, ["--dx" as any]: `${p.dx}px` }}>{p.e}</span>)}
          {!asleep && !sick && mood === "sad" && <span className="rwpet-fx" style={{ left: "62%", top: "10%", fontSize: 16, animation: "rwpetRain 2.2s ease-in infinite" }}>💧</span>}
          {!asleep && !sick && mood === "happy" && [["24%", "14%", 0], ["76%", "22%", 1.2]].map(([l, tp, d], i) => <span key={i} className="rwpet-fx" style={{ left: l as string, top: tp as string, fontSize: 14, animation: `rwpetSparkle 2.6s ease-in-out ${d}s infinite` }}>✨</span>)}
          {!asleep && (need || moodEmoji) && <span className="absolute -top-[18%] right-[-6%] bg-white rounded-full px-1.5 py-0.5 text-sm shadow" style={{ animation: "rwpetBubble 1.8s ease-in-out infinite" }}>{need || moodEmoji}</span>}
        </button>
      )}
      {pet.isSleeping && !pet.isEgg && <span className="absolute left-1/2 top-[30%] text-xl z-10" style={{ animation: "rwpetBreathe 1.6s ease-in-out infinite" }}>💤</span>}
      {line && !pet.isEgg && (
        <div key={line.k} ref={wander.bubbleRef} className="absolute z-20 pointer-events-none rounded-2xl bg-white px-3 py-1.5 text-center text-[12px] font-bold leading-snug text-slate-700 shadow-lg"
          style={{ left: `${bubbleLeft}%`, bottom: "60%", width: "max-content", maxWidth: "58%", animation: "rwpetBubbleIn .25s ease-out both" }}>
          {line.text}
          <span className="absolute left-1/2 -bottom-1.5 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
        </div>
      )}

      {/* lighting overlay */}
      <div className="absolute inset-0 pointer-events-none transition-colors duration-700" style={{ background: `rgba(10,14,45,${dim})` }} />
      {lightOn && dark && <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 58% 12%, rgba(255,214,107,.28), transparent 60%)" }} />}
      {!pet.isEgg && !sick && <span className="absolute right-2 bottom-2 z-10 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white">{mood === "happy" ? "😊 " + t("hm.pet.moodHappy") : mood === "sad" ? "🥺 " + t("hm.pet.moodSad") : "🙂 " + t("hm.pet.moodOk")}</span>}
      <span className="absolute left-2 bottom-2 z-10 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white">
        {phase === "night" ? t("hm.pet.night") : phase === "dusk" ? t("hm.pet.evening") : phase === "dawn" ? t("hm.pet.morning") : t("hm.pet.day")} · {lightOn ? t("hm.pet.lightOn") : t("hm.pet.lightOff")}
      </span>
    </div>
  );
}

// ── Shop: spend pet coins on furniture & costumes ────────────────────────
function PetShop({ home, pets, busy, onBuy, onPlace, onWear }: any) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"furniture" | "costume">("furniture");
  const [petId, setPetId] = useState<number>(pets[0]?.id);
  const [slot, setSlot] = useState("clothing");
  const items = (home.catalog || []).filter((i: any) => i.kind === tab && !i.hidden && (tab === "furniture" || i.slot === slot));
  const worn = home.costumes?.[String(petId)] || {};
  const gender = pets.find((p: any) => p.id === petId)?.gender;
  // Every buy, wear / take-off and place / take-out is confirmed first (an in-app box — phones block
  // window.confirm). After buying, it offers to wear the costume (or place the furniture) straight away.
  const [ask, setAsk] = useState<{ it: any; kind: "buy" | "wear" | "unwear" | "place" | "unplace"; after?: boolean } | null>(null);
  const confirmAsk = () => {
    if (!ask) return;
    const { it, kind } = ask;
    setAsk(null);
    if (kind === "buy") onBuy(it.id, () => setAsk({ it, kind: it.kind === "furniture" ? "place" : "wear", after: true }));
    else if (kind === "place") onPlace(it.slot, it.id);
    else if (kind === "unplace") onPlace(it.slot, null);
    else onWear(petId, it.id); // wearing the worn item again takes it off
  };
  const askText = ask && {
    buy: { title: t("hm.shop.buyTitle", { name: ask.it.name }), desc: t("hm.shop.buyDesc", { price: ask.it.price, coins: home.coins }), ok: t("hm.shop.buyBtn", { price: ask.it.price }), no: t("hm.shop.cancel") },
    wear: { title: t("hm.shop.wearTitle", { name: ask.it.name }), desc: t("hm.shop.wearDesc"), ok: t("hm.shop.wearBtn"), no: t(ask.after ? "hm.shop.later" : "hm.shop.cancel") },
    unwear: { title: t("hm.shop.unwearTitle", { name: ask.it.name }), desc: t("hm.shop.unwearDesc"), ok: t("hm.shop.unwearBtn"), no: t("hm.shop.cancel") },
    place: { title: t("hm.shop.placeTitle", { name: ask.it.name }), desc: t(home.placed?.[ask.it.slot] ? "hm.shop.placeSwapDesc" : "hm.shop.placeDesc"), ok: t("hm.shop.placeBtn"), no: t(ask.after ? "hm.shop.later" : "hm.shop.cancel") },
    unplace: { title: t("hm.shop.unplaceTitle", { name: ask.it.name }), desc: t("hm.shop.unplaceDesc"), ok: t("hm.shop.unplaceBtn"), no: t("hm.shop.cancel") },
  }[ask.kind];
  return (
    <div className="arc-panel mt-4" style={{ ["--c1" as any]: "#f7d774" }}>
      {ask && askText && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm" onClick={() => setAsk(null)}>
          <div role="dialog" aria-modal="true" className="arc-panel w-full max-w-xs text-center" style={{ ["--c1" as any]: "#f7d774" }} onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-32 w-32"><ItemPicture it={ask.it} home={home} gender={gender} /></div>
            <h3 className="text-lg font-black text-white">{askText.title}</h3>
            <p className="mt-1 text-sm text-white/65">{askText.desc}</p>
            <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <button onClick={() => setAsk(null)} className="rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-bold text-white/80">{askText.no}</button>
              <button onClick={confirmAsk} disabled={busy} className="pet-act" style={{ flexDirection: "row", padding: "10px 8px", ["--c" as any]: ask.kind === "unwear" || ask.kind === "unplace" ? "#64748b" : "#f59e0b" }}><span className="l">{askText.ok}</span></button>
            </div>
          </div>
        </div>, document.body)}
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3 className="arc-title flex items-center gap-2" style={{ fontSize: 16 }}>🏠 {t("hm.pet.shopTitle")}</h3>
        <span className="rwg-token-chip shrink-0 rounded-full border px-3 py-1 text-sm font-black text-amber-300">🐾 {home.coins}</span>
      </div>
      <p className="text-[11px] text-white/50 mb-3">{t("hm.pet.shopEarn", { play: home.rewards?.play, win: home.rewards?.win, crack: home.rewards?.numberCrack, today: home.earnedToday, cap: home.dailyCap })}</p>
      <div className="grid gap-1 p-1 rounded-2xl bg-black/40 border border-white/10 mb-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {([["furniture", t("hm.pet.tabRoom"), Sofa], ["costume", t("hm.pet.tabCostumes"), Shirt]] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)} className={`pet-tab ${tab === k ? "on" : ""}`}><Icon className="w-4 h-4" />{label}</button>
        ))}
      </div>
      {tab === "costume" && pets.length > 1 && (
        <div className="flex gap-2 mb-3">{pets.map((p: any) => <button key={p.id} onClick={() => setPetId(p.id)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${petId === p.id ? "bg-white/15 text-white" : "bg-white/5 text-white/50"}`}>{p.name}</button>)}</div>
      )}
      {tab === "costume" && WEAR_SLOTS.length > 1 && (
        <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {WEAR_SLOTS.map(([k, label, icon]) => (
            <button key={k} onClick={() => setSlot(k)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${slot === k ? "bg-white text-black" : "bg-white/5 text-white/60"}`}>{icon} {t(label)}</button>
          ))}
        </div>
      )}
      {/* inline columns: index.css forces grid-cols-* to 1 column on phones */}
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        {items.map((it: any) => {
          const owned = (home.owned || []).includes(it.id);
          const active = tab === "furniture" ? home.placed?.[it.slot] === it.id : worn[it.slot] === it.id;
          const label = !owned ? `🐾 ${it.price}` : tab === "furniture" ? (active ? t("hm.pet.inRoom") : t("hm.pet.place")) : (active ? t("hm.pet.wearing") : t("hm.pet.wear"));
          const onClick = () => !owned ? setAsk({ it, kind: "buy" }) : tab === "furniture" ? setAsk({ it, kind: active ? "unplace" : "place" }) : setAsk({ it, kind: active ? "unwear" : "wear" });
          return (
            <button key={it.id} onClick={onClick} disabled={busy || (!owned && home.coins < it.price)}
              className={`pet-item ${active ? "on" : ""} ${it.image ? "p-1.5" : "p-2.5"} ${it.image ? "disabled:opacity-60" : "disabled:opacity-40"}`}>
              <ItemPicture it={it} home={home} gender={gender} />
              <span className="text-[11px] font-semibold text-center leading-tight truncate w-full">{it.name}</span>
              <span className={`pet-price ${owned ? (active ? "text-amber-300" : "text-emerald-300") : "text-amber-200"}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// An item's picture in the shop and in its buy / wear box.
function ItemPicture({ it, home, gender }: any) {
  return it.overlay && it.anchor
    // Hats, glasses and neck items: show the full-body pet wearing just this item.
    ? <div className="relative w-full aspect-square overflow-hidden rounded-xl p-1" style={{ background: "radial-gradient(circle at 50% 40%, rgba(255,236,200,.22), rgba(255,255,255,.03) 70%)" }}><div className="relative h-full w-full"><DressedPet home={home} worn={{ [it.slot]: it.id }} alt={it.name} gender={gender} /></div></div>
    : it.figure
    ? <div className="relative w-full aspect-square overflow-hidden rounded-xl" style={{ background: "radial-gradient(circle at 50% 40%, rgba(255,236,200,.22), rgba(255,255,255,.03) 70%)" }}><img src={it.figure} alt={it.name} loading="lazy" className={`absolute inset-0 h-full w-full object-contain p-1 ${it.slot === "footwear" ? "object-center" : "object-bottom"}`} /></div>
    : it.image
    ? <img src={it.image} alt={it.name} loading="lazy" className="w-full aspect-square rounded-xl object-cover" />
    : <div className="flex h-full w-full items-center justify-center"><ItemArt id={it.id} emoji={it.emoji} className="text-3xl leading-none" style={{ width: 52, height: 52 }} /></div>;
}

// Wardrobe sections: only full costumes (hats, glasses, neck items and footwear were removed).
const WEAR_SLOTS: [string, string, string][] = [
  ["clothing", "hm.slot.clothing", "👕"],
];
// Which worn item's picture best shows the whole look (full-body shots first).
const PORTRAIT_ORDER = ["clothing", "footwear", "aura", "back", "head", "face", "neck", "hands", "shell", "tail"];
// Doluruu drawn from layers on a 300x360 canvas: clothing (or shirtless base),
// footwear, then face and head items placed by matching the eyes.
const CANVAS_W = 300, CANVAS_H = 360;
// The clean full-body Doluruu pictures, used whenever no clothing / shoes are worn
// (the sheet-cut shirtless base is clipped at the shell). box = tight crop around
// the pet inside the file; eyes = [x, y, distance] inside that box.
const PLAIN_PET = {
  male: { src: petMale, w: 500, h: 500, box: [72, 22, 332, 439], eyes: [128, 133, 102] },
  female: { src: petFemale, w: 1024, h: 1024, box: [158, 37, 655, 889], eyes: [248.5, 276.3, 200.7] },
};
// Soften the lower edge of hat / glasses overlays so they blend into the head.
const OVERLAY_FADE = "linear-gradient(to bottom, #000 70%, transparent 100%)";
// Shoes: the body layers end in cut-off feet, so with shoes on the body is trimmed just
// above the feet and the shoes sit a little smaller and lower, on the ground below.
const SHOE_PAD = 40, BODY_CUT = 338, SHOE_SCALE = 0.86, SHOE_DROP = 30;
function DressedPet({ home, worn, alt, gender, className = "" }: any) {
  // The clothing pictures are drawn for Doluruu's body; a company's own pet is shown as it is.
  const ownPicture = usePetBrand().imageUrl;
  if (ownPicture) return <img src={ownPicture} alt={alt} draggable={false} className={`absolute inset-0 h-full w-full object-contain object-bottom ${className}`} />;
  return <DoluruuFigure home={home} worn={worn} alt={alt} gender={gender} className={className} />;
}
// Where every picture of the dressed pet goes, in figure pixels — used by the still
// picture (DoluruuFigure) and by the moving cartoon puppet (PetRig) alike.
function figureSpec(home: any, worn: Record<string, string>, gender?: string): RigFigure {
  const plain = !worn.clothing && !worn.footwear && PLAIN_PET[gender === "female" ? "female" : "male"];
  const layers = plain ? [] : outfitLayers(home, worn) || [];
  const cloth = worn.clothing && itemById(home, worn.clothing);
  const shoes = !plain && layers.length > 1;
  const cw = plain ? plain.box[2] : CANVAS_W, ch = plain ? plain.box[3] : CANVAS_H + (shoes ? SHOE_PAD : 0);
  const eyes: number[] | undefined = plain ? plain.eyes : cloth?.eyes || home?.baseEyes;
  const out: RigFigure["layers"] = [];
  if (plain) out.push({ src: plain.src, x: -plain.box[0], y: -plain.box[1], w: plain.w, h: 0 });
  layers.forEach((src, i) => {
    const isShoe = shoes && i === layers.length - 1;
    const s = isShoe ? SHOE_SCALE : 1;
    out.push({ src, x: (CANVAS_W * (1 - s)) / 2, y: isShoe ? CANVAS_H * (1 - s) + SHOE_DROP : 0, w: CANVAS_W * s, h: CANVAS_H * s, ...(shoes && !isShoe ? { clip: BODY_CUT } : {}) });
  });
  // Neck first (under the chin), then glasses, then hats.
  if (eyes) for (const it of ["neck", "face", "head"].map((k) => worn[k] && itemById(home, worn[k])).filter((i: any) => i?.overlay && i.anchor) as any[]) {
    const [ax, ay, d, ow] = it.anchor; const s = eyes[2] / d;
    out.push({ src: it.overlay, x: eyes[0] - ax * s, y: eyes[1] - ay * s, w: ow * s, h: 0, fade: it.slot !== "neck", over: true });
  }
  return { cw, ch, layers: out, eyes };
}
function DoluruuFigure({ home, worn, alt, gender, className }: any) {
  const { cw, ch, layers } = figureSpec(home, worn, gender);
  return (
    <div className="absolute bottom-0 left-1/2 h-full -translate-x-1/2" style={{ aspectRatio: `${cw} / ${ch}` }}>
      {layers.map((l, i) => (
        <img key={l.src} src={l.src} alt={i === 0 ? alt : ""} draggable={false} className={`${l.h ? "" : "rwpet-layer "}absolute ${className}`}
          style={{ left: `${(l.x / cw) * 100}%`, top: `${(l.y / ch) * 100}%`, width: `${(l.w / cw) * 100}%`,
            ...(l.h ? { height: `${(l.h / ch) * 100}%` } : {}),
            ...(l.clip ? { clipPath: `inset(0 0 ${(((l.h - l.clip) / l.h) * 100).toFixed(2)}% 0)` } : {}),
            ...(l.fade ? { WebkitMaskImage: OVERLAY_FADE, maskImage: OVERLAY_FADE } : {}) }} />
      ))}
    </div>
  );
}
// Image layers for the walking pet: clothing (or the shirtless base) + footwear.
function outfitLayers(home: any, worn: Record<string, string>): string[] | null {
  if (!home?.baseLayer) return null;
  const cloth = worn.clothing && itemById(home, worn.clothing);
  const shoes = worn.footwear && itemById(home, worn.footwear);
  return [cloth?.layer || home.baseLayer, ...(shoes?.layer ? [shoes.layer] : [])];
}

// Shows the pet's current outfit using the item artwork: a big portrait of the
// main piece plus a row of everything else it's wearing.
function OutfitCard({ pet, home }: any) {
  const { t } = useTranslation();
  const worn: Record<string, string> = home?.costumes?.[String(pet.id)] || {};
  const items = WEAR_SLOTS.map(([k]) => worn[k] && itemById(home, worn[k])).filter((i: any) => i && (i.figure || i.image));
  if (!items.length) return null;
  const layers = outfitLayers(home, worn);
  const main = PORTRAIT_ORDER.map((k) => items.find((i: any) => i.slot === k)).find(Boolean) || items[0];
  return (
    <div className="mx-3 mt-3 flex items-center gap-3 rounded-2xl border border-amber-300/25 bg-gradient-to-r from-amber-300/10 to-fuchsia-400/10 p-2.5">
      <div className="h-20 w-20 shrink-0 rounded-xl shadow-lg ring-2 ring-amber-300/60" style={{ background: "radial-gradient(circle at 50% 40%, #fff3d6, #f3c98b)" }}>
        {layers
          ? <div className="relative h-full w-full p-1"><DressedPet home={home} worn={worn} alt="" gender={pet.gender} /></div>
          : <img src={main.figure || main.image} alt={main.name} className={`h-full w-full ${main.figure ? "object-contain object-bottom p-1" : "rounded-xl object-cover"}`} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-200/80">{t("hm.pet.todaysOutfit")}</p>
        <p className="truncate text-sm font-extrabold">{items.map((i: any) => i.name).join(" · ")}</p>
        <div className="mt-1.5 flex gap-1.5 overflow-x-auto">
          {items.filter((i: any) => layers || i.id !== main.id).map((i: any) => <img key={i.id} src={i.overlay ? i.image || i.figure : i.figure || i.image} alt={i.name} title={i.name} className={`h-9 w-9 shrink-0 rounded-lg ring-1 ring-white/15 ${i.figure ? "bg-white/10 object-contain" : "object-cover"}`} />)}
        </div>
      </div>
    </div>
  );
}

// Doluruu wanders around the room: walk to a random spot (waddling, shadow
// bobbing), then idle, look around or hop before choosing the next spot.
type WanderMode = "walk" | "idle" | "look" | "hop" | "dance" | "spin" | "stretch" | "wave";
// How long each pose lasts; idle / look get a random 1.8–4.4 s.
const POSE_MS: Record<string, number> = { hop: 1400, dance: 2300, spin: 1100, stretch: 1500, wave: 1600 };
// What the pet does after each walk — a happy pet dances and spins, a sad one just sits and looks around.
const POSES: Record<Mood, [WanderMode, number][]> = {
  happy: [["idle", 0.25], ["look", 0.1], ["hop", 0.2], ["dance", 0.25], ["spin", 0.1], ["wave", 0.1]],
  ok: [["idle", 0.45], ["look", 0.2], ["hop", 0.12], ["stretch", 0.08], ["wave", 0.1], ["dance", 0.05]],
  sad: [["idle", 0.7], ["look", 0.3]],
};
function useWander(active: boolean, mood: Mood) {
  const ref = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null); // the speech bubble follows the pet
  const xRef = useRef(30);
  const moodRef = useRef(mood); moodRef.current = mood;
  const api = useRef<{ goTo: (pct: number) => void; hold: (ms: number) => void } | null>(null);
  const [mode, setMode] = useState<WanderMode>("idle");
  const [facing, setFacing] = useState(1);
  const startX = 30;
  useEffect(() => {
    if (!active) { api.current = null; return; }
    let x = startX, target = x, raf = 0, last = performance.now(), until = last + 1500, holdUntil = 0, m: string = "idle";
    xRef.current = x;
    const set = (nm: WanderMode) => { m = nm; setMode(nm); };
    const pick = (now: number) => {
      if (m === "walk") { // arrived: pause and do something cute
        let n = Math.random(), next: WanderMode = "idle";
        for (const [k, w] of POSES[moodRef.current]) { if (n < w) { next = k; break; } n -= w; }
        set(next); until = now + (POSE_MS[next] ?? 1800 + Math.random() * 2600);
        return;
      }
      target = 2 + Math.random() * 60;
      if (Math.abs(target - x) < 8) target = x > 35 ? x - 20 : x + 20;
      setFacing(target > x ? 1 : -1); set("walk");
    };
    api.current = {
      goTo: (pct) => { holdUntil = 0; target = pct; if (Math.abs(target - x) < 2) return; setFacing(target > x ? 1 : -1); set("walk"); },
      hold: (ms) => { holdUntil = performance.now() + ms; if (m === "walk") set("idle"); until = holdUntil + 600; },
    };
    const tick = (now: number) => {
      const dt = Math.min(64, now - last) / 1000; last = now;
      if (now < holdUntil) { raf = requestAnimationFrame(tick); return; } // busy reacting (eating, bathing…)
      if (m === "walk") {
        const speed = moodRef.current === "sad" ? 6 : moodRef.current === "happy" ? 11 : 9;
        const step = speed * dt, d = target - x;
        if (Math.abs(d) <= step) { x = target; pick(now); } else x += Math.sign(d) * step;
        xRef.current = x;
        if (ref.current) ref.current.style.left = `${x}%`;
        if (bubbleRef.current) bubbleRef.current.style.left = `${Math.max(30, Math.min(70, x + 17))}%`;
      } else if (now > until) pick(now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); api.current = null; };
  }, [active]);
  return { ref, bubbleRef, xRef, api, mode, facing, startX };
}
