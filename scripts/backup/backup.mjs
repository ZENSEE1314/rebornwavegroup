// Encrypted copy of the whole database (every schema, every table) kept off the host.
// Run on a PC: BACKUP_DB_URL_FILE=<file holding the database address> BACKUP_PASSPHRASE_FILE=<file holding the passphrase> BACKUP_DIR=<folder> node scripts/backup/backup.mjs
// Plain Node + the `pg` package already in the app. Nothing secret is printed or put on the command line.
import { createWriteStream, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { once } from "node:events";
import { pipeline } from "node:stream/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import pg from "pg";
import { createEncryptStream, decryptBuffer } from "./backup-format.mjs";

const ROWS_PER_FETCH = 2000;
const DEFAULT_KEEP = 30;
const FILE_PREFIX = "reborn-backup-";
const FILE_SUFFIX = ".rbk";

const readSecretFile = (envName) => {
  const file = process.env[envName];
  if (!file) throw new Error(`${envName} is not set`);
  return readFileSync(file, "utf8").trim();
};

const stamp = () => new Date().toISOString().replace(/[:.]/g, "-").replace("Z", "Z");
const quoteIdent = (name) => `"${String(name).replace(/"/g, '""')}"`;

async function listTables(client) {
  const { rows } = await client.query(
    `SELECT schemaname AS s, tablename AS t FROM pg_tables
     WHERE schemaname NOT IN ('pg_catalog','information_schema') AND schemaname NOT LIKE 'pg\\_%' ESCAPE '\\'
     ORDER BY schemaname, tablename`,
  );
  return rows;
}

async function listSequences(client) {
  const { rows } = await client.query(
    `SELECT schemaname AS s, sequencename AS n, last_value AS v FROM pg_sequences
     WHERE schemaname NOT IN ('pg_catalog','information_schema') AND last_value IS NOT NULL`,
  );
  return rows.map((r) => ({ s: r.s, n: r.n, v: String(r.v) }));
}

async function writeLine(stream, object) {
  if (!stream.write(`${JSON.stringify(object)}\n`)) await once(stream, "drain");
}

/** Writes every row as one JSON line; returns how many rows each table had. */
async function dumpAll(client, sink) {
  const counts = {};
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const tables = await listTables(client);
  await writeLine(sink, { meta: { version: 1, at: new Date().toISOString(), tables: tables.length, sequences: await listSequences(client) } });
  for (const { s, t } of tables) {
    const key = `${s}.${t}`;
    counts[key] = 0;
    await client.query(`DECLARE c NO SCROLL CURSOR FOR SELECT row_to_json(x) AS r FROM ${quoteIdent(s)}.${quoteIdent(t)} x`);
    for (;;) {
      const { rows } = await client.query(`FETCH ${ROWS_PER_FETCH} FROM c`);
      if (rows.length === 0) break;
      for (const row of rows) await writeLine(sink, { t: key, r: row.r });
      counts[key] += rows.length;
    }
    await client.query("CLOSE c");
  }
  await client.query("COMMIT");
  await writeLine(sink, { end: counts });
  return counts;
}

/** Reads the finished file back with the passphrase and checks every table's row count against what was dumped. */
function verifyFile(file, passphrase, counts) {
  const text = gunzipSync(decryptBuffer(readFileSync(file), passphrase)).toString("utf8");
  const seen = {};
  let ended = false;
  for (const line of text.split("\n")) {
    if (!line) continue;
    const item = JSON.parse(line);
    if (item.t) seen[item.t] = (seen[item.t] || 0) + 1;
    if (item.end) ended = true;
  }
  if (!ended) throw new Error("the backup file has no end marker");
  for (const [table, count] of Object.entries(counts)) {
    if ((seen[table] || 0) !== count) throw new Error(`verify failed: ${table} has ${seen[table] || 0} rows in the file, ${count} in the database`);
  }
  return Object.values(seen).reduce((a, b) => a + b, 0);
}

function pruneOld(dir, keep) {
  const files = readdirSync(dir).filter((f) => f.startsWith(FILE_PREFIX) && f.endsWith(FILE_SUFFIX)).sort();
  for (const old of files.slice(0, Math.max(0, files.length - keep))) unlinkSync(path.join(dir, old));
  return files.length - Math.max(0, files.length - keep);
}

async function main() {
  const dbUrl = readSecretFile("BACKUP_DB_URL_FILE");
  const passphrase = readSecretFile("BACKUP_PASSPHRASE_FILE");
  const dir = process.env.BACKUP_DIR;
  if (!dir) throw new Error("BACKUP_DIR is not set");
  const keep = Number(process.env.BACKUP_KEEP || DEFAULT_KEEP);
  mkdirSync(dir, { recursive: true });

  const finalFile = path.join(dir, `${FILE_PREFIX}${stamp()}${FILE_SUFFIX}`);
  const partFile = `${finalFile}.part`;
  const client = new pg.Client({ connectionString: dbUrl, ssl: process.env.BACKUP_DB_SSL === "1" ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  const { input, output } = createEncryptStream(passphrase);
  const written = pipeline(output, createWriteStream(partFile));
  let counts;
  try {
    counts = await dumpAll(client, input);
  } finally {
    input.end();
    await client.end().catch(() => {});
  }
  await written;
  const rows = verifyFile(partFile, passphrase, counts);
  renameSync(partFile, finalFile);
  const kept = pruneOld(dir, keep);
  console.log(`BACKUP OK ${path.basename(finalFile)} ${Object.keys(counts).length} tables ${rows} rows ${(statSync(finalFile).size / 1048576).toFixed(1)} MB (${kept} kept)`);
}

main().catch((error) => {
  console.error(`BACKUP FAILED: ${error.message}`);
  process.exitCode = 1;
});
