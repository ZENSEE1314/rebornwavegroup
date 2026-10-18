import io
def patch(p, pairs):
    s = io.open(p, encoding="utf-8", newline="").read()
    crlf = "\r\n" in s
    for a, b in pairs:
        if crlf:
            a = a.replace("\n", "\r\n"); b = b.replace("\n", "\r\n")
        assert s.count(a) == 1, (p, s.count(a), a[:90])
        s = s.replace(a, b)
    io.open(p, "w", encoding="utf-8", newline="").write(s)

patch("server/rebornGame.ts", [
('import { cleanSaveLines, matchProduct, receiptNote } from "./receiptLogic";',
 'import { cleanSaveLines, matchProduct, receiptNote, PACK_UNIT_RE } from "./receiptLogic";'),
# when the movement happened = the receipt's date, so oldest-first (FIFO) layers and the accounting follow the real delivery day
("    const tag = `Receipt${invoiceNo ? ` ${invoiceNo}` : \"\"}${supplier ? ` from ${supplier}` : \"\"}`;\n    try {",
 "    const tag = `Receipt${invoiceNo ? ` ${invoiceNo}` : \"\"}${supplier ? ` from ${supplier}` : \"\"}`;\n    // The goods came in on the receipt's date: the stock movement and the purchase carry it (not today), like Restock's delivery date.\n    const receivedAt = date && new Date(`${date}${RECEIPT_TIME_SUFFIX}`) <= new Date() ? new Date(`${date}${RECEIPT_TIME_SUFFIX}`) : null;\n    const eachCost = (line: { unitCost: number; packSize: number }) => Math.round((line.unitCost / line.packSize) * 100) / 100;\n    try {"),
("          await tx.update(posProducts).set({ stock: sql`${posProducts.stock} + ${line.qty}`, ...(line.unitCost > 0 ? { cost: String(line.unitCost) } : {}),",
 "          const units = line.qty * line.packSize;\n          await tx.update(posProducts).set({ stock: sql`${posProducts.stock} + ${units}`, ...(line.unitCost > 0 ? { cost: String(eachCost(line)) } : {}),"),
("await tx.insert(stockMovements).values({ companyId: cid, productId: product.id, delta: line.qty, reason: \"stock_in\", supplier, unitCost: line.unitCost > 0 ? String(line.unitCost) : null, note: `${tag}${date ? ` (${date})` : \"\"}`.slice(0, 200), userId });",
 "await tx.insert(stockMovements).values({ companyId: cid, productId: product.id, delta: units, reason: \"stock_in\", supplier, unitCost: line.unitCost > 0 ? String(eachCost(line)) : null, note: `${tag}${date ? ` (${date})` : \"\"}${line.packSize > 1 ? ` · ${line.qty} × ${line.packSize}` : \"\"}`.slice(0, 200), userId, ...(receivedAt ? { createdAt: receivedAt } : {}) });"),
("          saved.push({ name: product.name, qty: line.qty });",
 "          saved.push({ name: product.name, qty: units });"),
("note: receiptNote({ supplier: supplier || \"\", invoiceNo, date }, saved), photoUrl, refType: \"receipt\", refId: invoiceNo || null, userId });",
 "note: receiptNote({ supplier: supplier || \"\", invoiceNo, date }, saved), photoUrl, refType: \"receipt\", refId: invoiceNo || null, userId, ...(receivedAt ? { createdAt: receivedAt } : {}) });"),
])
# constant near the top of the receipt routes: put it by the other receipt import
patch("server/rebornGame.ts", [
('import { cleanSaveLines, matchProduct, receiptNote, PACK_UNIT_RE } from "./receiptLogic";',
 'import { cleanSaveLines, matchProduct, receiptNote, PACK_UNIT_RE } from "./receiptLogic";\nconst RECEIPT_TIME_SUFFIX = "T05:00:00Z"; // noon in Jakarta / Singapore: a receipt has a day, not a time'),
])
print("server ok")

patch("client/src/components/ReceiptScan.tsx", [
("interface Line { key: number; productId: number | null; name: string; qty: number; unitCost: number }",
 "interface Line { key: number; productId: number | null; name: string; qty: number; unitCost: number; packSize: number }"),
("({ key: nextKey++, productId: null, name: \"\", qty: 1, unitCost: 0, ...l });",
 "({ key: nextKey++, productId: null, name: \"\", qty: 1, unitCost: 0, packSize: 1, ...l });"),
("newLine({ productId: it.productId ?? null, name: it.name, qty: it.qty, unitCost: roundMoney(it.unitCost) })",
 "newLine({ productId: it.productId ?? null, name: it.name, qty: it.qty, unitCost: roundMoney(it.unitCost), packSize: Math.max(1, Number(it.packSize) || 1) })"),
("items: (lines || []).map(({ productId, name, qty, unitCost }) => ({ productId, name, qty, unitCost })) })",
 "items: (lines || []).map(({ productId, name, qty, unitCost, packSize }) => ({ productId, name, qty, unitCost, packSize })) })"),
("                <div className=\"grid gap-2 items-end\" style={{ gridTemplateColumns: \"1fr 1.4fr 1.4fr\" }}>",
 "                <div className=\"grid gap-2 items-end\" style={{ gridTemplateColumns: \"1fr 1fr 1.4fr 1.4fr\" }}>"),
("                  <label className=\"text-[11px] text-white/50\">{t(\"admin.rcpt.unitCost\")}",
 "                  <label className=\"text-[11px] text-white/50\">{t(\"admin.rcpt.pack\")}<input type=\"number\" min={1} value={l.packSize} onChange={(e) => setLine(l.key, { packSize: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} className={inp + \" w-full mt-0.5\"} /></label>\n                  <label className=\"text-[11px] text-white/50\">{t(\"admin.rcpt.unitCost\")}"),
("                {l.productId && l.name && <p className=\"text-[11px] text-white/40 truncate\">{t(\"admin.rcpt.onReceipt\", { name: l.name })}</p>}",
 "                {l.productId && l.name && <p className=\"text-[11px] text-white/40 truncate\">{t(\"admin.rcpt.onReceipt\", { name: l.name })}</p>}\n                {l.packSize > 1 && <p className=\"text-[11px] text-emerald-300\">{t(\"admin.rcpt.packNote\", { units: String(l.qty * l.packSize), each: money(l.unitCost / l.packSize) })}</p>}"),
])

p = "client/src/lib/i18n/admin.ts"
s = io.open(p, encoding="utf-8", newline="").read()
crlf = "\r\n" in s
keys = ("  'admin.rcpt.pack': { en: \"Units per pack (1 = single)\", zh: \"每包数量（1 = 单件）\", id: \"Isi per kemasan (1 = satuan)\" },\n"
        "  'admin.rcpt.packNote': { en: \"= {units} units in stock, {each} each\", zh: \"= 入库 {units} 件，每件 {each}\", id: \"= {units} unit masuk stok, @ {each}\" },\n")
if crlf: keys = keys.replace("\n", "\r\n")
anchor = "  'admin.rcpt.unitCost':"
assert s.count(anchor) == 1, s.count(anchor)
s = s.replace(anchor, keys + anchor)
io.open(p, "w", encoding="utf-8", newline="").write(s)
print("client ok")
