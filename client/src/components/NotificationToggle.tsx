import { useEffect, useState } from "react";
import { Bell, BellOff, Share } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation, brandText } from "@/lib/i18n";
import { pushSupported, iosNeedsInstall, isIos, enablePush, disablePush, isPushActive, sendTestPush } from "@/lib/push";

export function NotificationToggle() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const supported = pushSupported();
  const needsInstall = iosNeedsInstall();

  useEffect(() => { isPushActive().then(setActive).catch(() => {}); }, []);

  const turnOn = async () => {
    setBusy(true);
    try {
      const r = await enablePush();
      if (r.ok) { setActive(true); toast({ title: t("hm.notif.onTitle"), description: t("hm.notif.onDesc") }); await sendTestPush().catch(() => {}); }
      else if (r.reason === "denied") toast({ title: t("hm.notif.blocked"), description: t("hm.notif.blockedDesc"), variant: "destructive" });
      else if (r.reason === "server-off") toast({ title: t("hm.notif.notReady"), description: t("hm.notif.notReadyDesc"), variant: "destructive" });
      else toast({ title: t("hm.notif.couldntEnable"), description: t("hm.notif.couldntEnableDesc"), variant: "destructive" });
    } catch (e: any) { toast({ title: t("hm.common.failed"), description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const turnOff = async () => {
    setBusy(true);
    try { await disablePush(); setActive(false); toast({ title: t("hm.notif.offTitle") }); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
      <div className="flex items-center gap-2 mb-1">
        {active ? <Bell className="w-4 h-4 text-amber-300" /> : <BellOff className="w-4 h-4 text-white/50" />}
        <h3 className="font-bold text-sm">{t("hm.notif.title")}</h3>
      </div>
      <p className="text-xs text-white/50 mb-3">{t("hm.notif.desc")}</p>

      {!supported ? (
        <p className="text-xs text-amber-300">{t("hm.notif.unsupported")}</p>
      ) : needsInstall ? (
        <div className="rounded-xl bg-amber-400/10 border border-amber-400/25 p-3">
          <p className="text-xs text-amber-200 font-semibold mb-1">{t("hm.notif.iosSetup")}</p>
          <ol className="text-[12px] text-white/70 list-decimal ml-4 space-y-0.5">
            <li>{t("hm.notif.ios1a")} <Share className="w-3 h-3 inline mb-0.5" /> {t("hm.notif.ios1b")}</li>
            <li>{t("hm.notif.ios2a")} <b>{t("hm.notif.ios2b")}</b></li>
            <li>{t("hm.notif.ios3a")} <b>{brandText("Reborn Wave")}</b> {t("hm.notif.ios3b")}</li>
            <li>{t("hm.notif.ios4a")} <b>{t("hm.notif.ios4b")}</b></li>
          </ol>
          <p className="text-[11px] text-white/40 mt-2">{t("hm.notif.appleOnly")}</p>
        </div>
      ) : active ? (
        <div className="flex gap-2">
          <button onClick={() => sendTestPush().then((n) => toast({ title: n ? t("hm.notif.testSent") : t("hm.notif.noDevice") }))} disabled={busy} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white/80">{t("hm.notif.sendTest")}</button>
          <button onClick={turnOff} disabled={busy} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500/15 border border-red-400/40 text-red-200">{t("hm.notif.turnOff")}</button>
        </div>
      ) : (
        <button onClick={turnOn} disabled={busy} className="w-full py-2.5 rounded-xl text-sm font-bold text-black disabled:opacity-60" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>
          {busy ? t("hm.notif.enabling") : t("hm.notif.turnOn")}
        </button>
      )}
      {isIos() && !needsInstall && !active && supported && <p className="text-[11px] text-white/40 mt-2">{t("hm.notif.iosHint")}</p>}
    </div>
  );
}
