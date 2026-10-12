// Reading any company's stock sheet: find the header row, match each column to an inventory field by the words in its
// title (English / Indonesian / 中文, typos tolerated), and tidy each row. Used by the Excel import in Admin › Inventory.
export type Cell = string | number | boolean | Date | null | undefined;
export const FIELDS = ["name", "volume", "category", "price", "cost", "stock", "supplier", "phone"] as const;
export type Field = (typeof FIELDS)[number];
export interface SheetRow { name: string; category: string; price: string; cost: string; stock: string; supplier: string; phone: string }
export type ColumnMap = Partial<Record<Field, number>>;

const HEADER_SCAN_ROWS = 15;
// Order matters: a column is claimed by the first field whose words fit, so "cost price" is a cost, not a price.
const FIELD_WORDS: Array<[Field, string[]]> = [
  ["phone", ["hp", "phone", "telp", "tel ", "contact", "whatsapp", "wa ", "mobile", "手机", "电话"]],
  ["supplier", ["suppl", "suplier", "supp", "vendor", "pemasok", "distributor", "供应商"]],
  ["cost", ["cost", "buy", "purchase", "modal", "hpp", "harga beli", "beli", "进价", "成本"]],
  ["price", ["sell", "price", "harga", "jual", "retail", "售价", "价格"]],
  ["stock", ["qty", "quantity", "stock", "stok", "on hand", "balance", "jumlah", "pcs", "库存", "数量"]],
  ["volume", ["volume", "size", "ukuran", "isi", "容量", "规格"]],
  ["category", ["categor", "kategori", "group", "jenis", "class", "分类", "类别"]],
  ["name", ["item", "name", "product", "produk", "nama", "barang", "description", "desc", "article", "名称", "商品", "品名"]],
];

const cellText = (cell: Cell) => (cell === null || cell === undefined ? "" : cell instanceof Date ? cell.toISOString().slice(0, 10) : String(cell).trim());

/** Which column holds which field, judged by the header titles. */
export function matchColumns(header: Cell[]): ColumnMap {
  const titles = header.map((cell) => ` ${cellText(cell).toLowerCase()} `);
  const map: ColumnMap = {};
  const claimed = new Set<number>();
  for (const [field, words] of FIELD_WORDS) {
    const index = titles.findIndex((title, i) => !claimed.has(i) && words.some((word) => title.includes(word)));
    if (index >= 0) { map[field] = index; claimed.add(index); }
  }
  return map;
}

/** The header is the row (within the first lines) that matches the most fields and has a name column. */
export function findHeader(sheet: Cell[][]): { index: number; columns: ColumnMap } | null {
  let best: { index: number; columns: ColumnMap; score: number } | null = null;
  sheet.slice(0, HEADER_SCAN_ROWS).forEach((row, index) => {
    const columns = matchColumns(row);
    const score = Object.keys(columns).length;
    if (columns.name !== undefined && score >= 2 && (!best || score > best.score)) best = { index, columns, score };
  });
  return best;
}

const CATEGORY_GUESSES: Array<[string, RegExp]> = [
  ["Soju", /soju|sake|makgeolli/i],
  ["Beer", /\bbeer\b|bir\b|heineken|bintang|guinness|carlsberg|tiger|corona|bud(weiser)?\b|asahi|stout|lager/i],
  ["Wine", /\bwine\b|champagne|prosecco|moet|cava|rose\b|merlot|chardonnay|sauvignon/i],
  ["Spirits", /whisk|vodka|\bgin\b|\brum\b|tequila|cuervo|jager|jameson|jack daniel|johnn?ie? ?walker|jhonny|chivas|glenfid|hendrick|brandy|cognac|hennessy|martell|remy|absolut|smirnoff|bacardi|baileys|liqueur|ballantine|royal salute|macallan|label|glenlivet/i],
  ["Soft drinks", /cola|sprite|fanta|soda|juice|jus\b|mineral|water|air putih|tonic|redbull|red bull|energy|tea\b|teh\b|coffee|kopi|syrup/i],
  ["Food", /fries|nugget|chicken|ayam|rice|nasi|noodle|mie\b|snack|chips|nuts|kacang|sausage|burger|pizza|cake|kue/i],
];

export function guessCategory(name: string): string {
  return CATEGORY_GUESSES.find(([, pattern]) => pattern.test(name))?.[0] ?? "General";
}

/** A volume is added to the name when the name does not already say it: "Soju Apple" + "36cl" → "Soju Apple 36cl". */
export function nameWithVolume(name: string, volume: string): string {
  if (!volume || name.toLowerCase().includes(volume.toLowerCase())) return name;
  return `${name} ${volume}`;
}

export interface ReadOptions { isCostTotal: boolean }

const numberOf = (text: string): number | null => {
  const cleaned = text.replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;
  const value = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned) ? Number(cleaned.replace(/,/g, "")) : /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned) ? Number(cleaned.replace(/\./g, "").replace(",", ".")) : Number(cleaned.replace(",", "."));
  return Number.isFinite(value) ? value : null;
};

/** The sheet as clean rows. With `isCostTotal` the cost column is the price of the whole quantity, so it is divided by the quantity. */
export function readSheetRows(sheet: Cell[][], options: ReadOptions = { isCostTotal: false }): SheetRow[] {
  const header = findHeader(sheet);
  if (!header) return [];
  const { columns } = header;
  const at = (row: Cell[], field: Field) => (columns[field] === undefined ? "" : cellText(row[columns[field]!]));
  const rows: SheetRow[] = [];
  for (const row of sheet.slice(header.index + 1)) {
    const name = nameWithVolume(at(row, "name"), at(row, "volume"));
    if (!at(row, "name")) continue;
    const stock = at(row, "stock");
    let cost = at(row, "cost");
    const quantity = numberOf(stock);
    const total = numberOf(cost);
    if (options.isCostTotal && total !== null && quantity && quantity > 0) cost = String(Math.round((total / quantity) * 100) / 100);
    rows.push({ name, category: at(row, "category") || guessCategory(name), price: at(row, "price"), cost, stock, supplier: at(row, "supplier"), phone: at(row, "phone").replace(/[^\d+]/g, "") });
  }
  return rows;
}
