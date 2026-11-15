// Admin › Security: the clock-in QR that staff scan to start their day. Security guards, managers and the main admin can open it, show it and print it;
// the code itself is the one in Admin › QR codes (only the main admin can replace it). Everyone else is refused by the server, so the card stays hidden.
import { useQuery } from "@tanstack/react-query";
import { Printer, QrCode } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";

export function AttendanceQrCard() {
  const { t } = useTranslation();
  const { data } = useQuery<{ code: string }>({
    queryKey: ["/api/reborn/admin/attendance/code"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/reborn/admin/attendance/code");
      return response.json();
    },
    retry: false,
  });
  if (!data?.code) return null;
  const qrUrl = `/api/reborn/admin/attendance/qr?v=${encodeURIComponent(data.code)}`;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="flex items-center gap-2 text-sm font-bold"><QrCode className="h-4 w-4 text-amber-300" /> {t("admin.sc.attendQr")}</p>
      <p className="mt-1 text-xs text-white/50">{t("admin.sc.attendQrHint")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="w-44 rounded-2xl bg-white p-3"><img src={qrUrl} alt={t("admin.sc.attendQr")} width={168} height={168} className="w-full" /></div>
        <button type="button" onClick={() => window.open(qrUrl, "_blank")} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-bold text-black"><Printer className="h-4 w-4" /> {t("admin.sc.attendQrOpen")}</button>
      </div>
    </div>
  );
}
