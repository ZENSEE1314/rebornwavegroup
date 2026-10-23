// Puts an encrypted backup back into a database whose tables already exist (start the app once on it, or run drizzle-kit push).
// node scripts/backup/restore.mjs <backup.rbk>   with BACKUP_PASSPHRASE_FILE and TARGET_DB_URL_FILE set.
// Refuses a database that already holds rows unless RESTORE_REPLACE=1 (then every table in the file is emptied first).
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import pg from "pg";
import { decryptBuffer } from "./backup-format.mjs";

const quoteIdent = (name) => `"${String(name).replace(/"/g, '""')}"`;
const quoteTable = (key) => key.split(/\.(.+)/).filter(Boolean).map(quoteIdent).join(".");

const readSecretFile = (envName) => {
  const file = process.env[envName];
  if (!file) throw new Error(`${envName} is not set`);
  return readFileSync(file, "utf8").trim();
};

async function main() {
  const backupFile = process.argv[2];
  if (!backupFile) throw new Error("usage: node scripts/backup/restore.mjs <backup.rbk>");
  const text = gunzipSync(decryptBuffer(readFileSync(backupFile), readSecretFile("BACKUP_PASSPHRASE_FILE"))).toString("utf8");
  const lines = text.split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const meta = lines.find((l) => l.meta)?.meta;
  const end = lines.find((l) => l.end)?.end;
  if (!meta || !end) throw new Error("the backup file is incomplete");

  const client = new pg.Client({ connectionString: readSecretFile("TARGET_DB_URL_FILE") });
  await client.connect();
  try {
    await client.query("BEGIN");
    // Rows come back in table order, not dependency order, so foreign keys are checked at the end instead.
    await client.query("SET LOCAL session_replication_role = replica");
    const tables = Object.keys(end);
    for (const table of tables) {
      const { rows } = await client.query(`SELECT count(*)::int AS n FROM ${quoteTable(table)}`);
      if (rows[0].n > 0) {
        if (process.env.RESTORE_REPLACE !== "1") throw new Error(`${table} already holds ${rows[0].n} rows; set RESTORE_REPLACE=1 to empty it first`);
        await client.query(`TRUNCATE ${quoteTable(table)} CASCADE`);
      }
    }
    let restored = 0;
    for (const line of lines) {
      if (!line.t) continue;
      await client.query(`INSERT INTO ${quoteTable(line.t)} SELECT * FROM json_populate_record(NULL::${quoteTable(line.t)}, $1::json)`, [JSON.stringify(line.r)]);
      restored += 1;
    }
    for (const seq of meta.sequences) {
      await client.query("SELECT setval($1::regclass, $2::bigint, true)", [`${quoteIdent(seq.s)}.${quoteIdent(seq.n)}`, seq.v]);
    }
    await client.query("COMMIT");
    console.log(`RESTORE OK ${tables.length} tables ${restored} rows from ${meta.at}`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`RESTORE FAILED: ${error.message}`);
  process.exitCode = 1;
});
