import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation, translate } from "@/lib/i18n";
import { BellRing, CheckCircle2, QrCode } from "lucide-react";

// Check in to KOS from a scanned QR: today's venue code, a /kos?venue=CODE link
// or a table QR link (/kos?table=T&k=SIG — also seats you at that table).
export function useVenueCheckIn() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  return (scanned: string) => {
    let body: any = { code: scanned };
    try {
      const u = new URL(scanned, window.location.origin);
      if (u.searchParams.get("table")) body = { table: u.searchParams.get("table"), k: u.searchParams.get("k") || "" };
      else if (u.searchParams.get("venue")) body = { code: u.searchParams.get("venue") };
    } catch { /* raw code */ }
    apiRequest("POST", "/api/reborn/venue/checkin", body).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || t("vn.kos.checkinFailed"));
      toast({ title: t("vn.kos.checkinDone"), description: data.message });
      for (const key of ["/api/reborn/kos/leaderboard", "/api/reborn/venue/status", "/api/reborn/song-queue-info"]) qc.invalidateQueries({ queryKey: [key] });
    }).catch((error) => toast({ title: t("vn.kos.checkinFailed"), description: error.message, variant: "destructive" }));
  };
}

// Live camera scanner for the venue check-in QR (encodes /kos?venue=CODE).
export function VenueScanner({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let scanner: any; let cancelled = false; let done = false;
    (async () => {
      try {
        const QrScanner = (await import("qr-scanner")).default;
        if (!videoRef.current || cancelled) return;
        scanner = new QrScanner(videoRef.current, (result: any) => {
          const data = typeof result === "string" ? result : result?.data;
          if (!data || done) return;
          done = true;
          try { scanner?.stop(); } catch {}
          onDetect(data); // venue/table link or raw code — checkIn() reads it
        }, { returnDetailedScanResult: true, highlightScanRegion: true, preferredCamera: "environment" });
        await scanner.start();
      } catch (e: any) { setErr(e?.message || translate("vn.kos.cameraError")); }
    })();
    return () => { cancelled = true; try { scanner?.stop(); scanner?.destroy(); } catch {} };
  }, []);
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
      <video ref={videoRef} className="w-full max-w-sm rounded-2xl aspect-square object-cover bg-black" muted playsInline />
      <p className="text-white/70 text-sm mt-3 text-center">{t("vn.kos.pointAt")}</p>
      {err && <p className="text-red-400 text-sm mt-2 text-center max-w-sm">{err}</p>}
      <button onClick={onClose} className="mt-4 px-6 py-2.5 rounded-xl font-bold bg-white/10 text-white">{t("vn.common.cancel")}</button>
    </div>
  );
}


// Home-page card: scan the table QR (or see which table you're checked in at).
// "Call service": shown only to a member who has scanned in at a table. Staff are told which table.
export function CallServiceCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [calling, setCalling] = useState(false);
  const { data: venue } = useQuery<any>({ queryKey: ["/api/reborn/venue/status"], queryFn: () => apiRequest("GET", "/api/reborn/venue/status").then((r) => r.json()), refetchInterval: 30000 });
  if (!venue?.checkedIn || !venue?.table) return null;
  const call = async () => {
    setCalling(true);
    try {
      const response = await apiRequest("POST", "/api/reborn/venue/call-service", {});
      toast({ title: (await response.json()).message });
    } catch (error: any) {
      toast({ title: String(error?.message || "").replace(/^\d+:\s*/, "") || t("hm.service.failed"), variant: "destructive" });
    } finally {
      setCalling(false);
    }
  };
  return (
    <button onClick={call} disabled={calling} className="arc-room-row w-full mb-4 text-left disabled:opacity-60" style={{ ["--c1" as any]: "#f97316" }}>
      <span className="arc-icon shrink-0" style={{ width: 46, height: 46, fontSize: 22, ["--c1" as any]: "#fdba74", ["--c2" as any]: "#ea580c" }}><span><BellRing className="w-6 h-6 text-white" /></span></span>
      <span className="min-w-0 flex-1">
        <span className="block font-black italic uppercase tracking-wide">{t("hm.service.title")}</span>
        <span className="block text-xs text-white/55">{t("hm.service.desc", { t: venue.table })}</span>
      </span>
      <span className="arc-play shrink-0" style={{ padding: "8px 12px", fontSize: 12 }}>{calling ? t("hm.service.calling") : t("hm.service.btn")}</span>
    </button>
  );
}

export function ScanTableCard() {
  const { t } = useTranslation();
  const [scanning, setScanning] = useState(false);
  const checkIn = useVenueCheckIn();
  const { data: venue } = useQuery<any>({ queryKey: ["/api/reborn/venue/status"], queryFn: () => apiRequest("GET", "/api/reborn/venue/status").then((r) => r.json()), refetchInterval: 30000 });
  const seated = venue?.checkedIn && venue?.table;
  return (
    <>
      <button onClick={() => setScanning(true)} className="arc-room-row w-full mb-4 text-left" style={{ ["--c1" as any]: seated ? "#22c55e" : "#f3b52f" }}>
        <span className="arc-icon shrink-0" style={{ width: 46, height: 46, fontSize: 22, ["--c1" as any]: seated ? "#86efac" : "#ffe89a", ["--c2" as any]: seated ? "#16a34a" : "#f3b52f" }}>
          <span>{seated ? <CheckCircle2 className="w-6 h-6 text-white" /> : <QrCode className="w-6 h-6 text-black" />}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-black italic uppercase tracking-wide">{seated ? t("vn.kos.checkedInTable", { t: venue.table }) : t("vn.kos.scanTableQr")}</span>
          <span className="block text-xs text-white/55">{seated ? t("hm.scan.again") : t("hm.scan.desc")}</span>
        </span>
        <span className="arc-play shrink-0" style={{ padding: "8px 12px", fontSize: 12 }}>📷 {t("hm.scan.btn")}</span>
      </button>
      {scanning && <VenueScanner onClose={() => setScanning(false)} onDetect={(code) => { setScanning(false); checkIn(code); }} />}
    </>
  );
}
