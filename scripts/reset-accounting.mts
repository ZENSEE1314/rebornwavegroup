// Clear the old accounting (ledger_entries) and keep only the stock that was just added from the Excel inventory import.
//
//   DATABASE_URL=<server database> npx tsx scripts/reset-accounting.mts                       # dry run: counts only, nothing changes
//   DATABASE_URL=<server database> npx tsx scripts/reset-accounting.mts --apply               # really do it
//   options: --schema tenant_5   the company's data space (default: public = Reborn)
//            --since 2026-10-01  only count Excel imports from this date on (default: every Excel import still in the stock history)
//            --decimals 2        money decimals of the company (default 0; SGD = 2)
//
// What it does, in ONE transaction: writes every old ledger row to accounting-backup-<time>.json (so nothing is lost), deletes all
// ledger rows, then adds one "purchase" expense for each Excel-import delivery (quantity × unit cost). Not touched: products, stock
// counts, stock movements, POS bills and sales history, members, payroll settings. Daily sales and Admin › Accounting totals now start again.
import pg from "pg";
import { writeFileSync } from "node:fs";
import { IMPORT_NOTE_PATTERN, purchaseEntryFromDelivery } from "../server/accountingReset.ts";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string, fallback: string) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const schema = option("schema", "public");
const since = option("since", "");
const decimals = Number(option("decimals", "0")) || 0;
const apply = flag("apply");

if (!process.env.DATABASE_URL) { console.error("Set DATABASE_URL to the server's database first."); process.exit(1); }
if (!/^[a-z_][a-z0-9_]*$/i.test(schema)) { console.error(`Bad schema name: ${schema}`); process.exit(1); }
if (since && !/^\d{4}-\d{2}-\d{2}/.test(since)) { console.error("--since must look like 2026-10-01"); process.exit(1); }

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: /sslmode=require|railway|neon|supabase/i.test(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : undefined });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query(`SET LOCAL search_path TO "${schema}"`);

  const old = (await client.query("SELECT * FROM ledger_entries ORDER BY id")).rows;
  const byCategory = new Map<string, { n: number; sum: number }>();
  for (const r of old) { const k = `${r.kind}/${r.category}`; const c = byCategory.get(k) || { n: 0, sum: 0 }; c.n++; c.sum += Number(r.amount); byCategory.set(k, c); }

  const deliveries = (await client.query(
    `SELECT m.id, p.name AS "productName", m.delta, m.unit_cost AS "unitCost", m.supplier, m.created_at AS "createdAt"
       FROM stock_movements m JOIN pos_products p ON p.id = m.product_id
      WHERE m.reason = 'stock_in' AND m.note LIKE $1 ${since ? "AND m.created_at >= $2" : ""}
      ORDER BY m.id`, since ? [IMPORT_NOTE_PATTERN, since] : [IMPORT_NOTE_PATTERN])).rows;
  const entries = deliveries.map((d) => purchaseEntryFromDelivery(d, decimals)).filter((e) => e !== null);
  const skipped = deliveries.length - entries.length;
  const total = entries.reduce((s, e) => s + Number(e!.amount), 0);

  console.log(`Data space: ${schema}${since ? `, imports since ${since}` : ""}`);
  console.log(`Old accounting rows that will be deleted: ${old.length}`);
  for (const [k, c] of Array.from(byCategory).sort()) console.log(`   ${k.padEnd(34)} ${String(c.n).padStart(6)} rows   total ${c.sum.toLocaleString("en-US")}`);
  console.log(`Excel-import deliveries found: ${deliveries.length} → ${entries.length} purchase entries (total ${total.toLocaleString("en-US")})${skipped ? `, ${skipped} skipped (no cost)` : ""}`);

  if (!apply) { await client.query("ROLLBACK"); console.log("\nDRY RUN — nothing changed. Run again with --apply to do it."); process.exit(0); }

  const file = `accounting-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(file, JSON.stringify(old, null, 1));
  console.log(`Backup written: ${file} (${old.length} rows)`);

  await client.query("DELETE FROM ledger_entries");
  for (const e of entries) {
    await client.query("INSERT INTO ledger_entries (kind, category, amount, note, ref_type, ref_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7, now()))", [e!.kind, e!.category, e!.amount, e!.note, e!.refType, e!.refId, e!.createdAt]);
  }
  await client.query("COMMIT");
  console.log(`Done: deleted ${old.length} old rows, added ${entries.length} purchase entries.`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Failed, nothing was changed:", error);
  process.exitCode = 1;
} finally {
  await client.end();
}
