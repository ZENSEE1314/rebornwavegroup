import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { QrCode, X } from "lucide-react";

import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";

// Gives the QR pictures a moment to draw before the print dialog opens.
const PRINT_DELAY_MS = 400;

// Admin-only: the fixed QR for every table, laid out to print and stick on tables.
// `only` limits the sheet to those table numbers; `autoPrint` opens the print dialog at once
// (the one-by-one Print button on each table).
export function TableQrSheet({ onClose, only, autoPrint }: { onClose: () => void; only?: string[]; autoPrint?: boolean }) {
  const { t } = useTranslation();
  const { data: tables = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/venue/tables"], queryFn: () => apiRequest("GET", "/api/reborn/admin/venue/tables").then((r) => r.json()), refetchInterval: 15000 });
  const shown = only ? tables.filter((tb) => only.includes(tb.label)) : tables;
  useEffect(() => {
    if (!autoPrint || isLoading || shown.length === 0) return;
    const timer = setTimeout(() => window.print(), PRINT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [autoPrint, isLoading, shown.length]);
  return (
    <div className="table-qr-sheet fixed inset-0 z-[60] overflow-y-auto bg-[#0d0818] p-4">
      <style>{`@media print{body *{visibility:hidden}.table-qr-sheet,.table-qr-sheet *{visibility:visible}.table-qr-sheet{position:absolute;inset:0;background:#fff;color:#000;overflow:visible}.no-print{display:none!important}.tq-card{break-inside:avoid;border:1px solid #999!important;background:#fff!important;color:#000!important}}`}</style>
      <div className="no-print flex items-center gap-2 mb-3">
        <h3 className="font-bold text-lg flex-1 flex items-center gap-2"><QrCode className="w-5 h-5 text-amber-300" /> {t("vn.kos.tableQrs")}</h3>
        <button onClick={() => window.print()} className="px-3 py-2 rounded-xl bg-amber-300 text-black text-sm font-bold">{t("vn.kos.print")}</button>
        <button onClick={onClose} className="arc-btn" style={{ width: 36, height: 36 }}><X className="w-4 h-4" /></button>
      </div>
      <p className="no-print text-xs text-white/55 mb-4">{t("vn.kos.tableQrsDesc")}</p>
      {isLoading && <p className="text-white/50 text-sm">…</p>}
      {!isLoading && shown.length === 0 && <p className="text-white/50 text-sm">{t("vn.kos.noTables")}</p>}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
        {shown.map((tb) => (
          <div key={tb.label} className="tq-card rounded-2xl bg-white text-black p-3 text-center">
            <div className="w-full aspect-square [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: tb.svg }} />
            <p className="font-black text-xl mt-1">{t("vn.kos.tableN", { t: tb.label })}</p>
            <p className="text-[11px] text-black/60 truncate">{tb.area}</p>
            <p className="text-[11px] text-black/70 mt-0.5">{t("vn.kos.scanToCheckin")}</p>
            <p className="no-print text-[11px] font-bold text-emerald-700 mt-1">{t("vn.kos.seatedNow", { n: tb.checkedIn })}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
