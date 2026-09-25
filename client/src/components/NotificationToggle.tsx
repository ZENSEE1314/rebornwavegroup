import { useEffect, useState } from "react";
import { Bell, BellOff, Share } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { pushSupported, iosNeedsInstall, isIos, enablePush, disablePush, isPushActive, sendTestPush } from "@/lib/push";

export function NotificationToggle() {
  const { toast } = useToast();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const supported = pushSupported();
  const needsInstall = iosNeedsInstall();

  useEffect(() => { isPushActive().then(setActive).catch(() => {}); }, []);

  const turnOn = async () => {
    setBusy(true);
    try {
      const r = await enablePush();
      if (r.ok) { setActive(true); toast({ title: "🔔 Notifications on", description: "You'll get alerts on this phone." }); await sendTestPush().catch(() => {}); }
      else if (r.reason === "denied") toast({ title: "Blocked", description: "Allow notifications for this site in your browser settings, then try again.", variant: "destructive" });
      else if (r.reason === "server-off") toast({ title: "Not ready", description: "Push isn't configured on the server yet.", variant: "destructive" });
      else toast({ title: "Couldn't enable", description: "Your browser didn't allow push here.", variant: "destructive" });
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const turnOff = async () => {
    setBusy(true);
    try { await disablePush(); setActive(false); toast({ title: "Notifications off" }); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
      <div className="flex items-center gap-2 mb-1">
        {active ? <Bell className="w-4 h-4 text-amber-300" /> : <BellOff className="w-4 h-4 text-white/50" />}
        <h3 className="font-bold text-sm">Phone notifications</h3>
      </div>
      <p className="text-xs text-white/50 mb-3">Get a pop-up on your phone for bookings, reminders, orders, rewards and more — even when the app is closed.</p>

      {!supported ? (
        <p className="text-xs text-amber-300">This browser doesn't support push. Open the app in Chrome (Android) or Safari (iPhone).</p>
      ) : needsInstall ? (
        <div className="rounded-xl bg-amber-400/10 border border-amber-400/25 p-3">
          <p className="text-xs text-amber-200 font-semibold mb-1">iPhone / iPad — one-time setup</p>
          <ol className="text-[12px] text-white/70 list-decimal ml-4 space-y-0.5">
            <li>Tap the <Share className="w-3 h-3 inline mb-0.5" /> Share button in Safari</li>
            <li>Choose <b>Add to Home Screen</b></li>
            <li>Open <b>Reborn Wave</b> from your home screen</li>
            <li>Come back here and tap <b>Turn on</b></li>
          </ol>
          <p className="text-[11px] text-white/40 mt-2">Apple only allows notifications for apps added to the home screen.</p>
        </div>
      ) : active ? (
        <div className="flex gap-2">
          <button onClick={() => sendTestPush().then((n) => toast({ title: n ? "Test sent 🔔" : "No device subscribed" }))} disabled={busy} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white/80">Send test</button>
          <button onClick={turnOff} disabled={busy} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500/15 border border-red-400/40 text-red-200">Turn off</button>
        </div>
      ) : (
        <button onClick={turnOn} disabled={busy} className="w-full py-2.5 rounded-xl text-sm font-bold text-black disabled:opacity-60" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>
          {busy ? "Enabling…" : "🔔 Turn on notifications"}
        </button>
      )}
      {isIos() && !needsInstall && !active && supported && <p className="text-[11px] text-white/40 mt-2">If nothing happens, make sure you opened this from the home-screen app.</p>}
    </div>
  );
}
