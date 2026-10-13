import { useMemo, useRef, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { findHeader, readSheetRows, type Cell } from "@shared/inventorySheet";

interface Props { industries: string[]; onDone: () => void; onMessage: (text: string, isError?: boolean) => void }

const PREVIEW_ROWS = 5;
const TEMPLATE = "No.,Item,Volume,QTY,Cost,Selling,Supplier,HP no.,Category\n1,Jameson,700ml,6,340000,520000,Nanda,81265661257,Spirits\n2,Heineken,330ml,120,28000,45000,PT Sumber,,Beer\n";

// A small CSV reader that understands "quoted, values" and doubled quotes.
function parseCsv(text: string): Cell[][] {
  const rows: Cell[][] = [];
  let row: string[] = [];
  let value = "";
  let isQuoted = false;
  const endValue = () => { row.push(value); value = ""; };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (isQuoted) {
      if (char === '"' && text[i + 1] === '"') { value += '"'; i++; } else if (char === '"') isQuoted = false; else value += char;
    } else if (char === '"') isQuoted = true;
    else if (char === "," || char === ";" || char === "\t") endValue();
    else if (char === "\n" || char === "\r") { if (char === "\r" && text[i + 1] === "\n") i++; endValue(); rows.push(row); row = []; }
    else value += char;
  }
  if (value || row.length) { endValue(); rows.push(row); }
  return rows;
}

async function readFile(file: File): Promise<Cell[][]> {
  if (/\.csv$/i.test(file.name)) return parseCsv(await file.text());
  const { readSheet } = await import("read-excel-file/browser"); // only fetched when a spreadsheet is chosen
  return (await readSheet(file)) as Cell[][];
}

export default function InventoryImport({ industries, onDone, onMessage }: Props) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<Cell[][]>([]);
  const [isCostTotal, setIsCostTotal] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [isDelivery, setIsDelivery] = useState(false);
  // With a single industry there is nothing to choose: every imported item belongs to it.
  const assigned = industries.length === 1 ? industries : chosen;
  const rows = useMemo(() => readSheetRows(sheet, { isCostTotal }), [sheet, isCostTotal]);
  const withoutPrice = rows.filter((row) => !row.price.trim()).length;

  const choose = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsBusy(true);
    try {
      const read = await readFile(file);
      setSheet(read);
      if (!findHeader(read)) onMessage(t("admin.imp.noRows"), true);
    } catch { onMessage(t("admin.imp.unreadable"), true); } finally { setIsBusy(false); }
  };

  const send = async () => {
    setIsBusy(true);
    try {
      const result = await (await apiRequest("POST", "/api/reborn/admin/inventory/import", { rows, industries: assigned, mode: isDelivery ? "delivery" : "count" })).json();
      onMessage(result.message);
      setSheet([]);
      onDone();
    } catch (error) { onMessage(String((error as Error).message || "").replace(/^\d{3}:\s*/, ""), true); } finally { setIsBusy(false); }
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url; link.download = "inventory-template.csv"; link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-3 space-y-2">
      <p className="text-sm font-bold flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-emerald-300" /> {t("admin.imp.title")}</p>
      <p className="text-[11px] text-white/50">{t("admin.imp.hint")}</p>
      <div className="flex flex-wrap gap-2">
        <input ref={input} type="file" accept=".xlsx,.csv" onChange={choose} className="hidden" />
        <button type="button" onClick={() => input.current?.click()} disabled={isBusy} className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-xs font-semibold bg-emerald-500 text-black disabled:opacity-40">{t("admin.imp.choose")}</button>
        <button type="button" onClick={downloadTemplate} className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-xs font-semibold bg-white/5 text-white/80 border border-white/10">{t("admin.imp.template")}</button>
      </div>
      {rows.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-white/70">{t("admin.imp.found", { n: String(rows.length) })}</p>
          {industries.length > 1 && (
            <div className="space-y-1">
              <p className="text-xs text-white/60">{t("admin.imp.industry")}</p>
              <div className="flex flex-wrap gap-1.5">
                {industries.map((name) => <button type="button" key={name} onClick={() => setChosen(chosen.includes(name) ? chosen.filter((x) => x !== name) : [...chosen, name])} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${chosen.includes(name) ? "bg-amber-400 text-black border-amber-400" : "bg-white/5 text-white/70 border-white/10"}`}>{name}</button>)}
              </div>
            </div>
          )}
          {withoutPrice > 0 && <p className="text-xs text-amber-300">{t("admin.imp.noPrice", { n: String(withoutPrice) })}</p>}
          <label className="flex items-center gap-2 text-xs text-white/70"><input type="checkbox" checked={isDelivery} onChange={(event) => setIsDelivery(event.target.checked)} /> {t("admin.imp.delivery")}</label>
          <label className="flex items-center gap-2 text-xs text-white/70"><input type="checkbox" checked={isCostTotal} onChange={(event) => setIsCostTotal(event.target.checked)} /> {t("admin.imp.costTotal")}</label>
          <ul className="text-[11px] text-white/60 space-y-0.5">
            {rows.slice(0, PREVIEW_ROWS).map((row, i) => <li key={i} className="truncate">{row.name} · {row.category} · {row.price || "–"} / {row.cost || "–"} · {row.stock || "–"}{row.supplier ? ` · ${row.supplier}` : ""}</li>)}
          </ul>
          <button type="button" onClick={send} disabled={isBusy} className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg font-bold text-black text-sm bg-amber-400 disabled:opacity-40">{t("admin.imp.import", { n: String(rows.length) })}</button>
        </div>
      )}
    </div>
  );
}
