// Run after the cloud server is back: everything made while it was down arrives, once.
import pg from "pg";
const VENUE = process.env.VENUE || "http://127.0.0.1:4000";
const cloudDb = new pg.Client({ connectionString: process.env.CLOUD_DB || "postgres://postgres:pw@127.0.0.1:54329/reborn" });
const venueDb = new pg.Client({ connectionString: process.env.VENUE_DB || "postgres://postgres:pw@127.0.0.1:54330/reborn" });
await cloudDb.connect(); await venueDb.connect();
const one = async (db, sql, a = []) => (await db.query(sql, a)).rows[0];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0; const check = (n, ok, e = "") => { console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " → " + e)); if (!ok) failures++; };
async function waitFor(fn, ms = 60000) { const end = Date.now() + ms; while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch {} await sleep(2000); } return null; }
const same = async (sql) => { const a = (await cloudDb.query(sql)).rows, b = (await venueDb.query(sql)).rows; return JSON.stringify(a) === JSON.stringify(b); };

const waiting = Number((await one(venueDb, "select count(*) c from sync_log where seq > (select sent_through from sync_state where peer='cloud')")).c);
console.log("waiting at the venue before the cloud returned:", waiting);
const converged = await waitFor(async () => Number((await one(venueDb, "select count(*) c from sync_log where seq > (select sent_through from sync_state where peer='cloud')")).c) === 0);
check("everything waiting was sent after the cloud came back", !!converged, "");
check("tickets are identical on both sides", await waitFor(() => same("select id, order_no, status, total from pos_tickets order by id")), "");
check("ticket lines are identical", await waitFor(() => same("select id, order_id, name, qty, status, station, printed_at is not null as printed from pos_ticket_items order by id")), "");
check("stock is identical (every sale counted once)", await waitFor(() => same("select id, stock from pos_products order by id")), JSON.stringify([(await cloudDb.query("select id, stock from pos_products order by id")).rows, (await venueDb.query("select id, stock from pos_products order by id")).rows]));
check("members are identical", await waitFor(() => same("select id, email, username, kgold, tokens, credits from users order by id")), "");
check("ledger is identical", await waitFor(() => same("select id, kind, amount, ref_type, ref_id from ledger_entries order by id")), "");
check("stock movements are identical", await waitFor(() => same("select id, product_id, delta, reason from stock_movements order by id")), "");
check("nothing failed", Number((await one(cloudDb, "select count(*) c from sync_failures")).c) === 0 && Number((await one(venueDb, "select count(*) c from sync_failures")).c) === 0, "");
console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
await cloudDb.end(); await venueDb.end();
