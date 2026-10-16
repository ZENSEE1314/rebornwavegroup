import EmbeddedPostgres from "embedded-postgres";
const pg = new EmbeddedPostgres({ databaseDir: process.env.TEST_DB_DIR || "./.test-db", user: "postgres", password: "pw", port: 54329, persistent: true, initdbFlags: ["--encoding=UTF8", "--locale=C"] });
await pg.initialise();
await pg.start();
try { await pg.createDatabase("reborn"); } catch (e) { console.log("db exists?", e.message); }
console.log("PG READY");
setInterval(() => {}, 1 << 30);
