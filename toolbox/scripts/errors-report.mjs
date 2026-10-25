// Read-only report of the POS and system errors (the same data as Admin › Errors), grouped by path and message.
//   DATABASE_URL_FILE=C:\RebornStandby\database-url.txt node toolbox/scripts/errors-report.mjs [days] [area]
// It only reads. It never prints the database address.
import { readFileSync } from "node:fs";
import pg from "pg";

const DEFAULT_DAYS = 7;
const MAX_ROWS = 30;
const file = process.env.DATABASE_URL_FILE || "C:\\RebornStandby\\database-url.txt";
const days = Number(process.argv[2]) || DEFAULT_DAYS;
const area = process.argv[3] || null;

const client = new pg.Client({ connectionString: readFileSync(file, "utf8").trim() });
await client.connect();
try {
  await client.query("SET default_transaction_read_only = on");
  const grouped = await client.query(
    `SELECT area, status, method, regexp_replace(coalesce(path,''), '[0-9]+', 'N', 'g') AS path, left(message, 100) AS message, count(*)::int AS n, max(created_at) AS last
     FROM app_errors WHERE created_at > now() - ($1 || ' days')::interval AND ($2::text IS NULL OR area = $2)
     GROUP BY 1,2,3,4,5 ORDER BY n DESC LIMIT ${MAX_ROWS}`,
    [String(days), area],
  );
  console.log(`Errors in the last ${days} day(s)${area ? ` in area ${area}` : ""}, most frequent first:`);
  console.table(grouped.rows.map((r) => ({ ...r, last: r.last?.toISOString?.() })));
  console.log("How to read it: status 0 + 'Failed to fetch' = the browser could not reach the server (network). 403 'Staff only' = a non-staff login. 'Order not open' = a stale screen. Anything else: find the route.");
} finally {
  await client.end();
}
