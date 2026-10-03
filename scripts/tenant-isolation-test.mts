// Company data-space isolation test. Run against an EMPTY scratch database, never production:
//   DATABASE_URL=<scratch> npx drizzle-kit push --force && DATABASE_URL=<scratch> npx tsx scripts/tenant-isolation-test.mts
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

const root = "../";
const { db, platformDb, pool } = await import(root + "server/db.ts");
const { runInTenant, homeCompanySlug } = await import(root + "server/tenantContext.ts");
const { ensureBridgeXSchema } = await import(root + "server/bridgeX.ts");
const { provisionTenantSpace, tenantForRequest, syncTenantSchema, listTenantSpaces } = await import(root + "server/tenantSpace.ts");
const { users, appSettings, bridgeCompanies, bridgeCompanyMembers, bridgeBranches } = await import(root + "shared/schema.ts");
const { resolveCompany } = await import(root + "server/tenant.ts");

let failed = 0;
const check = (name: string, ok: boolean, detail?: unknown) => { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + JSON.stringify(detail)}`); };

await ensureBridgeXSchema();
const [reborn] = await platformDb.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, "reborn-wave-group"));
check("platform company exists", !!reborn);

// A Reborn member + a Reborn admin setting
const rebornUserId = randomUUID();
await platformDb.insert(users).values({ id: rebornUserId, email: `member-${rebornUserId.slice(0, 6)}@reborn.test`, firstName: "RebornMember", role: "admin", referralCode: `R${rebornUserId.slice(0, 8)}` });
await platformDb.insert(appSettings).values({ key: "clubName", value: "Reborn Club" }).onConflictDoUpdate({ target: appSettings.key, set: { value: "Reborn Club" } });

// A second company with an owner account
const ownerId = randomUUID();
await platformDb.insert(users).values({ id: ownerId, email: `owner-${ownerId.slice(0, 6)}@chillx.test`, firstName: "ChillOwner", role: "user", referralCode: `C${ownerId.slice(0, 8)}` });
const slug = `chillx-${ownerId.slice(0, 5)}`;
const [company] = await platformDb.insert(bridgeCompanies).values({ slug, name: "ChillX", appName: "ChillX" }).returning();
const [branch] = await platformDb.insert(bridgeBranches).values({ companyId: company.id, name: "Main", code: "MAIN" }).returning();
await platformDb.insert(bridgeCompanyMembers).values({ companyId: company.id, userId: ownerId, branchId: branch.id, role: "owner" });

const started = Date.now();
const schema = await provisionTenantSpace(company.id);
console.log(`provisioned ${schema} in ${Date.now() - started} ms`);
const tenant = { companyId: company.id, slug, schema };

// 1. Tenant sees only its own accounts; owner copied in as admin
const tenantUsers = await runInTenant(tenant, () => db.select().from(users));
check("tenant has exactly the owner account", tenantUsers.length === 1 && tenantUsers[0].id === ownerId, tenantUsers.map((u: any) => u.email));
check("owner is main admin inside the tenant", tenantUsers[0]?.role === "admin", tenantUsers[0]?.role);
check("owner stays a normal user on the platform", (await platformDb.select().from(users).where(eq(users.id, ownerId)))[0].role === "user");

// 2. Writes inside the tenant never reach the platform, and the reverse
const tenantMemberId = randomUUID();
await runInTenant(tenant, () => db.insert(users).values({ id: tenantMemberId, email: "guest@chillx.test", firstName: "ChillGuest", referralCode: `G${tenantMemberId.slice(0, 8)}` }));
check("tenant sign-up is invisible to Reborn", (await db.select().from(users).where(eq(users.id, tenantMemberId))).length === 0);
check("Reborn member is invisible to tenant", (await runInTenant(tenant, () => db.select().from(users).where(eq(users.id, rebornUserId)))).length === 0);

// 3. Settings are separate
await runInTenant(tenant, () => db.insert(appSettings).values({ key: "clubName", value: "ChillX Bar" }));
const rebornSetting = (await db.select().from(appSettings).where(eq(appSettings.key, "clubName")))[0]?.value;
const tenantSetting = (await runInTenant(tenant, () => db.select().from(appSettings).where(eq(appSettings.key, "clubName"))))[0]?.value;
check("Reborn setting unchanged", rebornSetting === "Reborn Club", rebornSetting);
check("tenant setting is its own", tenantSetting === "ChillX Bar", tenantSetting);

// 4. Platform tables are shared on purpose (not copied)
const tenantTables = (await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema=$1 AND table_type='BASE TABLE'`, [schema])).rows.map((r: any) => r.table_name);
check("no bridge_* or sessions copies in the tenant", !tenantTables.some((t: string) => t.startsWith("bridge_") || t === "sessions"), tenantTables.filter((t: string) => t.startsWith("bridge_")));
// The space sees ONLY itself: a table that isn't there must fail, never fall through to Reborn's.
await pool.query(`CREATE TABLE public.test_only_on_platform (id int)`);
const fellThrough = await runInTenant(tenant, () => db.execute(sql`SELECT 1 FROM test_only_on_platform`)).then(() => true, () => false);
await pool.query(`DROP TABLE public.test_only_on_platform`);
check("a table missing from the space errors instead of reading the platform's", fellThrough === false);
// Platform (BridgeX) tables are reachable for reads and writes through views
const viaView = await runInTenant(tenant, () => db.insert(bridgeBranches).values({ companyId: company.id, name: "Second", code: "B2" }).returning());
check("BridgeX rows can be written from inside the space (serial id + returning)", viaView[0]?.id > 0 && (await platformDb.select().from(bridgeBranches).where(eq(bridgeBranches.id, viaView[0].id))).length === 1, viaView);
const upsert = await runInTenant(tenant, () => db.execute(sql`INSERT INTO bridge_company_modules (company_id, module_key, enabled) VALUES (${company.id}, 'pos', true) ON CONFLICT (company_id, module_key) DO UPDATE SET enabled=true RETURNING module_key`)).then((r: any) => r.rows.length, (e: any) => String(e.message));
check("ON CONFLICT upserts work through the views", upsert === 1, upsert);
check("tenant still reads its company row from the platform", (await runInTenant(tenant, () => db.select().from(bridgeCompanies).where(eq(bridgeCompanies.id, company.id)))).length === 1);
const publicCount = (await pool.query(`SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name NOT LIKE 'bridge\\_%' AND table_name<>'sessions'`)).rows[0].n;
check(`every member-app table was copied (${tenantTables.length}/${publicCount})`, tenantTables.length === publicCount);

// 5. Own id counters
const seqDefault = (await pool.query(`SELECT pg_get_expr(d.adbin, d.adrelid) e FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum WHERE d.adrelid=$1::regclass AND pg_get_expr(d.adbin, d.adrelid) LIKE 'nextval(%' LIMIT 1`, [`"${schema}"."pos_products"`])).rows[0]?.e;
check("tenant tables use their own id counters", String(seqDefault || "").includes(schema), seqDefault);

// 6. Company resolution inside the space
check("home company inside tenant is the tenant", (await runInTenant(tenant, () => homeCompanySlug())) === slug);
check("home company outside is Reborn", homeCompanySlug() === "reborn-wave-group");
const resolved = await runInTenant(tenant, () => resolveCompany({ header: () => "reborn-wave-group", hostname: "x" } as any));
check("a spoofed tenant header cannot leave the space", resolved?.id === company.id, resolved?.slug);

// 7. Request routing
const req = (o: any) => ({ hostname: o.host, path: o.path || "/api/reborn/me", headers: { cookie: o.cookie || "", referer: o.referer || "" }, header: (n: string) => (n.toLowerCase() === "x-tenant-slug" ? o.slug : undefined) }) as any;
check("header selects the tenant on the platform host", (await tenantForRequest(req({ host: "bridgexpos.up.railway.app", slug })))?.schema === schema);
check("cookie selects the tenant", (await tenantForRequest(req({ host: "bridgexpos.up.railway.app", cookie: `a=1; bx_tenant=${slug}` })))?.schema === schema);
check("rebornwave.group always stays Reborn", (await tenantForRequest(req({ host: "rebornwave.group", slug, cookie: `bx_tenant=${slug}` }))) === null);
check("BridgeX API stays on platform data", (await tenantForRequest(req({ host: "bridgexpos.up.railway.app", slug, path: "/api/v1/company/users" }))) === null);
check("BridgeX console pages stay on platform data", (await tenantForRequest(req({ host: "bridgexpos.up.railway.app", slug, referer: "https://bridgexpos.up.railway.app/bridgex?tab=company" }))) === null);
check("unknown slug falls back to the platform", (await tenantForRequest(req({ host: "bridgexpos.up.railway.app", slug: "nope" }))) === null);
check("registry lists the tenant", (await listTenantSpaces()).some((t: any) => t.schema === schema));

// 8. A later app version adds a column and a table: sync brings the tenant up to date
await pool.query(`ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS test_note varchar DEFAULT 'x'`);
await pool.query(`CREATE TABLE IF NOT EXISTS public.test_new_feature (id serial PRIMARY KEY, label varchar)`);
await syncTenantSchema(schema);
const cols = (await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='app_settings'`, [schema])).rows.map((r: any) => r.column_name);
check("new column reached the tenant", cols.includes("test_note"), cols);
check("new table reached the tenant", (await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_schema=$1 AND table_name='test_new_feature'`, [schema])).rowCount === 1);
check("tenant data survived the sync", (await runInTenant(tenant, () => db.select().from(users))).length === 2);
await pool.query(`ALTER TABLE public.app_settings DROP COLUMN test_note; DROP TABLE public.test_new_feature; DROP TABLE "${schema}".test_new_feature`);

// 9. Transactions and raw SQL also stay inside
await runInTenant(tenant, () => db.transaction(async (tx: any) => { await tx.execute(sql`UPDATE users SET first_name='Renamed' WHERE id=${tenantMemberId}`); }));
check("raw SQL in a transaction hit the tenant", (await runInTenant(tenant, () => db.select().from(users).where(eq(users.id, tenantMemberId))))[0]?.firstName === "Renamed");
check("…and not the platform", (await db.execute(sql`SELECT count(*)::int n FROM users WHERE first_name='Renamed'`)).rows[0].n === 0);

// 10. Parallel requests in different spaces don't bleed
const mixed = await Promise.all(Array.from({ length: 40 }, (_, i) => (i % 2 ? runInTenant(tenant, async () => (await db.select().from(users)).length) : (async () => (await db.select().from(users)).length)())));
const platformCount = (await platformDb.select().from(users)).length;
check("40 interleaved queries each saw their own space", mixed.every((n, i) => n === (i % 2 ? 2 : platformCount)), mixed);

console.log(failed ? `\n${failed} CHECK(S) FAILED` : "\nALL CHECKS PASSED");
process.exit(failed ? 1 : 0);
