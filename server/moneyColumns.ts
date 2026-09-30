// Widen money / KGOLD columns so big balances fit: RP up to 16 digits
// (1,000,000,000 top-ups) and KGOLD as bigint (no practical cap).
// Runs at boot; each ALTER only happens when the column still has the old type.
import { sql } from "drizzle-orm";
import { db } from "./db";

const WIDEN: [table: string, column: string, type: string][] = [
  ["users", "credits", "numeric(16,2)"],
  ["users", "kgold", "bigint"],
  ["topup_requests", "amount", "numeric(16,2)"],
  ["ledger_entries", "amount", "numeric(16,2)"],
  ["member_wallet_transactions", "kgold_amount", "bigint"],
  ["member_wallet_transactions", "rp_amount", "numeric(18,2)"],
  ["kos_gifts", "kgold_cost", "bigint"],
  ["kos_gifts", "recipient_kgold", "bigint"],
  ["kos_gift_types", "kgold_cost", "bigint"],
  ["credit_history", "amount", "numeric(16,2)"],
  ["transactions", "amount", "numeric(16,2)"],
];

export async function ensureMoneyColumns() {
  for (const [table, column, type] of WIDEN) {
    try {
      const r: any = await db.execute(sql`SELECT data_type, numeric_precision FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}`);
      const col = (r.rows || r)[0];
      if (!col) continue; // table not created in this deployment
      const want = type.startsWith("numeric") ? Number(type.match(/\((\d+)/)![1]) : null;
      const ok = want ? col.data_type === "numeric" && Number(col.numeric_precision) >= want : col.data_type === "bigint";
      if (ok) continue;
      await db.execute(sql.raw(`ALTER TABLE ${table} ALTER COLUMN ${column} TYPE ${type}`));
      console.log(`[db] widened ${table}.${column} → ${type}`);
    } catch (e) { console.error(`[db] could not widen ${table}.${column}`, e); }
  }
}
