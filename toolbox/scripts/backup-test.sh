#!/bin/bash
# Proves the encrypted backup: dump, encrypt, verify, restore into a second empty database, compare counts and content; a wrong passphrase and a changed file are refused.
# Uses a throw-away Postgres on 54339 and test passphrases only.
REPO="$(git rev-parse --show-toplevel)"
SP="${TOOLBOX_SCRATCH:-$(mktemp -d)}"
cd "$REPO"
rm -rf scripts/e2e-tmp && mkdir scripts/e2e-tmp
sed -e 's/54329/54339/g' scripts/e2e/start-test-db.mjs > scripts/e2e-tmp/start-test-db.mjs
export TEST_DB_DIR="$SP/pg-bk-$(date +%s)"
node scripts/e2e-tmp/start-test-db.mjs > "$SP/bk-db.log" 2>&1 &
until grep -q "PG READY" "$SP/bk-db.log" 2>/dev/null; do sleep 2; done
cat > scripts/e2e-tmp/prep.mjs <<'EOF'
import pg from "pg";
const base = "postgres://postgres:pw@127.0.0.1:54339";
const admin = new pg.Client({ connectionString: `${base}/reborn` });
await admin.connect();
await admin.query("CREATE DATABASE reborn2");
await admin.end();
EOF
node scripts/e2e-tmp/prep.mjs
for db in reborn reborn2; do DATABASE_URL=postgres://postgres:pw@127.0.0.1:54339/$db npx drizzle-kit push --force > "$SP/bk-push-$db.log" 2>&1; done
cat > scripts/e2e-tmp/seed.mjs <<'EOF'
import pg from "pg";
const ddl = `
CREATE SCHEMA IF NOT EXISTS tenant_9;
CREATE TABLE tenant_9."odd ""name" (id serial PRIMARY KEY, note text, at timestamp, amount numeric(12,2), tags text[], data jsonb, raw bytea, flag boolean);
CREATE TABLE public.bk_parent (id serial PRIMARY KEY, name text);
CREATE TABLE public.bk_child (id serial PRIMARY KEY, parent_id int REFERENCES public.bk_parent(id), label text);`;
for (const db of ["reborn", "reborn2"]) {
  const c = new pg.Client({ connectionString: `postgres://postgres:pw@127.0.0.1:54339/${db}` });
  await c.connect(); await c.query(ddl); await c.end();
}
const c = new pg.Client({ connectionString: "postgres://postgres:pw@127.0.0.1:54339/reborn" });
await c.connect();
await c.query(`INSERT INTO tenant_9."odd ""name" (note, at, amount, tags, data, raw, flag) VALUES
 ('line1
line2 "quoted" \\ backslash 中文 🎉', '2026-10-22 23:59:59.123456', 1234567.89, ARRAY['a','b,c','d"e'], '{"k":[1,2,{"z":null}]}', '\\xdeadbeef', true),
 (NULL, NULL, NULL, NULL, NULL, NULL, false)`);
await c.query(`INSERT INTO public.bk_parent (name) SELECT 'p' || g FROM generate_series(1,5000) g`);
await c.query(`INSERT INTO public.bk_child (parent_id, label) SELECT (g % 5000) + 1, 'c' || g FROM generate_series(1,5000) g`);
await c.end();
EOF
node scripts/e2e-tmp/seed.mjs
echo -n "postgres://postgres:pw@127.0.0.1:54339/reborn" > "$SP/bk-src.url"
echo -n "postgres://postgres:pw@127.0.0.1:54339/reborn2" > "$SP/bk-dst.url"
echo -n "correct horse battery staple 42" > "$SP/bk-pass.txt"
echo -n "a different passphrase entirely!" > "$SP/bk-wrong.txt"
rm -rf "$SP/bk-out"
echo "== backup"
BACKUP_DB_URL_FILE="$SP/bk-src.url" BACKUP_PASSPHRASE_FILE="$SP/bk-pass.txt" BACKUP_DIR="$SP/bk-out" node scripts/backup/backup.mjs
F=$(ls "$SP/bk-out"/*.rbk | head -1)
echo "== file is not readable text"; head -c 4 "$F"; echo; grep -c "p1000" "$F" || true
echo "== restore with wrong passphrase (must fail)"
TARGET_DB_URL_FILE="$SP/bk-dst.url" BACKUP_PASSPHRASE_FILE="$SP/bk-wrong.txt" node scripts/backup/restore.mjs "$F"
echo "== restore with right passphrase"
TARGET_DB_URL_FILE="$SP/bk-dst.url" BACKUP_PASSPHRASE_FILE="$SP/bk-pass.txt" node scripts/backup/restore.mjs "$F"
echo "== restore again without REPLACE (must refuse)"
TARGET_DB_URL_FILE="$SP/bk-dst.url" BACKUP_PASSPHRASE_FILE="$SP/bk-pass.txt" node scripts/backup/restore.mjs "$F"
echo "== compare"
cat > scripts/e2e-tmp/compare.mjs <<'EOF'
import pg from "pg";
const open = async (db) => { const c = new pg.Client({ connectionString: `postgres://postgres:pw@127.0.0.1:54339/${db}` }); await c.connect(); return c; };
const a = await open("reborn"), b = await open("reborn2");
const tables = (await a.query("SELECT schemaname s, tablename t FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2")).rows;
let bad = 0;
for (const { s, t } of tables) {
  const id = (n) => `"${n.replace(/"/g, '""')}"`;
  const q = `SELECT count(*)::int n, md5(coalesce(string_agg(x::text, '|' ORDER BY x::text), '')) h FROM ${id(s)}.${id(t)} x`;
  const ra = (await a.query(q)).rows[0], rb = (await b.query(q)).rows[0];
  if (ra.n !== rb.n || ra.h !== rb.h) { bad++; console.log("DIFF", s, t, ra.n, rb.n); }
}
console.log(bad === 0 ? `PASS all ${tables.length} tables identical (count + content hash)` : `FAIL ${bad} tables differ`);
const seq = async (c) => (await c.query("INSERT INTO public.bk_parent (name) VALUES ('next') RETURNING id")).rows[0].id;
const ia = await seq(a), ib = await seq(b);
console.log(ia === ib ? `PASS the next id after restore is the same (${ib})` : `FAIL next id ${ia} vs ${ib}`);
await a.end(); await b.end();
EOF
node scripts/e2e-tmp/compare.mjs
echo "== tampered file (must fail)"
cp "$F" "$SP/bk-tamper.rbk"; printf '\x00' | dd of="$SP/bk-tamper.rbk" bs=1 seek=100 conv=notrunc 2>/dev/null
RESTORE_REPLACE=1 TARGET_DB_URL_FILE="$SP/bk-dst.url" BACKUP_PASSPHRASE_FILE="$SP/bk-pass.txt" node scripts/backup/restore.mjs "$SP/bk-tamper.rbk"
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 54339 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force -ErrorAction SilentlyContinue }"
rm -rf scripts/e2e-tmp
echo BK-DONE
