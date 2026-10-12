import { useRef, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";

type Cell = string | number | boolean | Date | null | undefined;
interface ImportRow { name: string; category: string; price: string; cost: string; stock: string; supplier: string }
interface Props { onDone: () => void; onMessage: (text: string, isError?: boolean) => void }

const PREVIEW_ROWS = 5;
const FIELD_WORDS: Record<keyof ImportRow, string[]> = {
  name: ["name", "item", "product", "nama", "barang", "produk", "名称", "商品", "品名"],
  category: ["category", "type", "group", "kategori", "jenis", "分类", "类别"],
  price: ["price", "selling", "sell", "harga", "retail", "售价", "价格"],
  cost: ["cost", "buy", "purchase", "modal", "hpp", "成本", "进价"],
  stock: ["stock", "qty", "quantity", "balance", "stok", "jumlah", "库存", "数量"],
  supplier: ["supplier", "vendor", "pemasok", "供应商"],
};
const TEMPLATE = "Name,Category,Price,Cost,Stock,Supplier\nHeineken 330ml,Beer,45000,28000,120,PT Sumber\nFrench Fries,Food,30000,12000,50,\n";

const cellText = (cell: Cell) => (cell === null || cell === undefined ? "" : cell instanceof Date ? cell.toISOString().slice(0, 10) : String(cell));

// The first row is the header: each column is matched to a field by the words in its title.
function toRows(sheet: Cell[][]): ImportRow[] {
  if (sheet.length < 2) return [];
  const header = sheet[0].map((cell) => cellText(cell).toLowerCase());
  const column = (field: keyof ImportRow) => header.findIndex((title) => FIELD_WORDS[field].some((word) => title.includes(word)));
  const at = { name: column("name"), category: column("category"), price: column("price"), cost: column("cost"), stock: column("stock"), supplier: column("supplier") };
  if (at.name < 0) return [];
  const pick = (row: Cell[], index: number) => (index < 0 ? "" : cellText(row[index]));
  return sheet.slice(1).map((row) => ({ name: pick(row, at.name), category: pick(row, at.category), price: pick(row, at.price), cost: pick(row, at.cost), stock: pick(row, at.stock), supplier: pick(row, at.supplier) })).filter((row) => row.name.trim());
}

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

export default function InventoryImport({ onDone, onMessage }: Props) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  const choose = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsBusy(true);
    try {
      const found = toRows(await readFile(file));
      setRows(found);
      if (!found.length) onMessage(t("admin.imp.noRows"), true);
    } catch { onMessage(t("admin.imp.unreadable"), true); } finally { setIsBusy(false); }
  };

  const send = async () => {
    setIsBusy(true);
    try {
      const result = await (await apiRequest("POST", "/api/reborn/admin/inventory/import", { rows })).json();
      onMessage(result.message);
      setRows([]);
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
          <ul className="text-[11px] text-white/60 space-y-0.5">
            {rows.slice(0, PREVIEW_ROWS).map((row, i) => <li key={i} className="truncate">{row.name} · {row.category || "General"} · {row.price || "–"} / {row.cost || "–"} · {row.stock || "–"}</li>)}
          </ul>
          <button type="button" onClick={send} disabled={isBusy} className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg font-bold text-black text-sm bg-amber-400 disabled:opacity-40">{t("admin.imp.import", { n: String(rows.length) })}</button>
        </div>
      )}
    </div>
  );
}
