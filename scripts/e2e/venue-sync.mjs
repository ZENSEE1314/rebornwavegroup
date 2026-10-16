// Needs: a cloud server (3999, venue sync switched on) and a venue server (4000, VENUE_MODE=1) already copied once. See README.
import pg from "pg";
const CLOUD = process.env.CLOUD || "http://127.0.0.1:3999";
const VENUE = process.env.VENUE || "http://127.0.0.1:4000";
const cloudDb = new pg.Client({ connectionString: process.env.CLOUD_DB || "postgres://postgres:pw@127.0.0.1:54329/reborn" });
const venueDb = new pg.Client({ connectionString: process.env.VENUE_DB || "postgres://postgres:pw@127.0.0.1:54330/reborn" });
await cloudDb.connect(); await venueDb.connect();
let failures = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  → " + extra)); if (!ok) failures++; };
const one = async (db, sql, args = []) => (await db.query(sql, args)).rows[0];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(label, fn, ms = 40000) { const end = Date.now() + ms; while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch { /* retry */ } await sleep(1500); } return null; }
function session(base) {
  let cookie = "";
  return async (method, path, body) => {
    const res = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
    const set = res.headers.getSetCookie?.() || []; if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
    const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json };
  };
}
const atVenue = session(VENUE), atCloud = session(CLOUD);
const stamp = Date.now();

// 1. people can log in on the venue PC with the same account
let r = await atVenue("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
check("admin logs in on the venue PC with the cloud password", r.status === 200, JSON.stringify(r.json));
await atCloud("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
const venueUsers = Number((await one(venueDb, "select count(*) c from users")).c), cloudUsers = Number((await one(cloudDb, "select count(*) c from users")).c);
check("the first copy brought every user", venueUsers === cloudUsers, `${venueUsers} vs ${cloudUsers}`);

// 2. a sale at the venue reaches the cloud, with the same ids, the stock change and the ledger
const product = await one(venueDb, "select id, stock from pos_products where price > 0 and package_kind is null and bundle_item_id is null order by id limit 1");
r = await atVenue("POST", "/api/reborn/pos/sale", { paymentMethod: "cash", cashReceived: 500000, items: [{ productId: product.id, qty: 2 }] });
check("sale at the venue works", r.status === 200, JSON.stringify(r.json)?.slice(0, 150));
const ticket = await one(venueDb, "select id, order_no from pos_tickets order by id desc limit 1");
check("venue ids start high (never meet cloud ids)", Number(ticket.id) >= 1_000_000_000, ticket.id);
const sameTicket = await waitFor("ticket in the cloud", async () => one(cloudDb, "select id from pos_tickets where id=$1", [ticket.id]));
check("the sale reaches the cloud with the same id", !!sameTicket, "");
const cloudItems = Number((await one(cloudDb, "select count(*) c from pos_ticket_items where order_id=$1", [ticket.id])).c);
check("its lines came too", cloudItems === 1, cloudItems);
const cloudStock = await waitFor("stock in the cloud", async () => { const p = await one(cloudDb, "select stock from pos_products where id=$1", [product.id]); return Number(p.stock) === Number(product.stock) - 2 ? p : null; });
check("stock went down by 2 in the cloud too", !!cloudStock, JSON.stringify(await one(cloudDb, "select stock from pos_products where id=$1", [product.id])));
check("ledger entry arrived", !!(await waitFor("ledger", async () => one(cloudDb, "select id from ledger_entries where ref_type='pos_order' and ref_id=$1", [String(ticket.id)]))), "");

// 3. a change made in the cloud reaches the venue
await cloudDb.query("update pos_products set price = price + 1000 where id=$1", [product.id]);
const cloudPrice = Number((await one(cloudDb, "select price from pos_products where id=$1", [product.id])).price);
check("a price change in the cloud reaches the venue", !!(await waitFor("price", async () => Number((await one(venueDb, "select price from pos_products where id=$1", [product.id])).price) === cloudPrice)), "");

// 4. counters add up from both sides; different columns of one row both survive
const user = await one(cloudDb, "select id, kgold, first_name, last_name from users where email='guest@test.local'");
await cloudDb.query("update users set kgold = kgold + 300, first_name = 'CloudFirst' where id=$1", [user.id]);
await venueDb.query("update users set kgold = kgold + 500, last_name = 'VenueLast' where id=$1", [user.id]);
const merged = await waitFor("merge", async () => {
  const a = await one(cloudDb, "select kgold, first_name, last_name from users where id=$1", [user.id]);
  const b = await one(venueDb, "select kgold, first_name, last_name from users where id=$1", [user.id]);
  return Number(a.kgold) === Number(user.kgold) + 800 && Number(b.kgold) === Number(user.kgold) + 800 && a.last_name === "VenueLast" && b.first_name === "CloudFirst" ? { a, b } : null;
}, 60000);
check("kgold +300 (cloud) and +500 (venue) both count on both sides, and both name changes survive", !!merged,
  JSON.stringify([await one(cloudDb, "select kgold, first_name, last_name from users where id=$1", [user.id]), await one(venueDb, "select kgold, first_name, last_name from users where id=$1", [user.id])]));

// 5. a sign-up at the venue, and a delete
r = await atVenue("POST", "/api/auth/register", { email: `walkin${stamp}@test.local`, password: "Passw0rd!", firstName: "Walk", lastName: "In", phoneNumber: "0812" + String(stamp).slice(-8), dateOfBirth: "1995-05-05", gender: "male" });
check("sign-up works on the venue PC", r.status === 200, JSON.stringify(r.json));
check("the new member reaches the cloud (with the email as username)", !!(await waitFor("signup", async () => { const u = await one(cloudDb, "select username from users where email=$1", [`walkin${stamp}@test.local`]); return u?.username === `walkin${stamp}@test.local`; })), "");
const toDelete = await one(venueDb, "insert into faq_items (question, answer, active) values ('Delete me?', 'yes', true) returning id");
await waitFor("faq in cloud", async () => one(cloudDb, "select id from faq_items where id=$1", [toDelete.id]));
await venueDb.query("delete from faq_items where id=$1", [toDelete.id]);
check("a delete at the venue is deleted in the cloud", !!(await waitFor("deleted", async () => !(await one(cloudDb, "select id from faq_items where id=$1", [toDelete.id])))), "");

// 6. nothing echoes: once everything has settled, the logs stop growing
await sleep(25000);
const logsBefore = [Number((await one(cloudDb, "select count(*) c from sync_log")).c), Number((await one(venueDb, "select count(*) c from sync_log")).c)];
await sleep(25000);
const logsAfter = [Number((await one(cloudDb, "select count(*) c from sync_log")).c), Number((await one(venueDb, "select count(*) c from sync_log")).c)];
check("no ping-pong: both logs stay the same size while idle", logsBefore[0] === logsAfter[0] && logsBefore[1] === logsAfter[1], JSON.stringify({ logsBefore, logsAfter }));
check("nothing failed to apply", Number((await one(cloudDb, "select count(*) c from sync_failures")).c) === 0 && Number((await one(venueDb, "select count(*) c from sync_failures")).c) === 0, JSON.stringify(await venueDb.query("select tbl, error from sync_failures limit 3").then((x) => x.rows)));

// 7. the cloud ignores a push it already has (a lost answer, sent again)
const token = process.env.TOKEN;
if (token) {
  const entry = (await venueDb.query("select seq::float8 seq, tbl, op, pk, row, changes, deltas from sync_log order by seq desc limit 1")).rows[0];
  const before = Number((await one(cloudDb, "select count(*) c from pos_tickets")).c);
  const again = await fetch(CLOUD + "/api/venue-sync/push", { method: "POST", headers: { "content-type": "application/json", "x-venue-token": token }, body: JSON.stringify({ entries: entry ? [entry] : [], through: entry?.seq || 0 }) });
  check("a repeated push is accepted and changes nothing", again.status === 200 && Number((await one(cloudDb, "select count(*) c from pos_tickets")).c) === before, again.status);
  const bad = await fetch(CLOUD + "/api/venue-sync/hello", { headers: { "x-venue-token": "wrong" } });
  check("a wrong token is refused", bad.status === 401, bad.status);
}
console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
await cloudDb.end(); await venueDb.end();
