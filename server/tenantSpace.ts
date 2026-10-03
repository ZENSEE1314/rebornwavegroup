import { createRequire } from "node:module";
import type { NextFunction, Request, Response } from "express";

import { pool } from "./db";
import { currentTenant, runInTenant, schemaNameFor, type TenantSpace } from "./tenantContext";

// ── Which tables a company owns ─────────────────────────────────────────────
// Everything in `public` is copied into a company's data space except the platform's
// own tables: BridgeX (companies, members, modules, billing…) and login sessions.
// BridgeX tables are shared on purpose (every row carries its company_id) and are exposed
// inside each space as views; sessions are only ever used through the platform connection.
const isBridgeTable = (table: string) => table.startsWith("bridge_");
const isPlatformTable = (table: string) => isBridgeTable(table) || table === "sessions";

const REGISTRY_TTL_MS = 30_000;
const TENANT_COOKIE = "bx_tenant";
// Hosts that always serve Reborn's own data, whatever a browser remembers.
const FLAGSHIP_HOSTS = new Set(["rebornwave.group", "www.rebornwave.group", "rebornwavegroup.com"]);
// BridgeX platform API and console always work on platform data.
const PLATFORM_API_PREFIX = "/api/v1/";
const PLATFORM_PAGE_PREFIX = "/bridgex";

const ident = (name: string) => `"${name.replace(/"/g, '""')}"`;

const literal = (value: string) => `'${value.replace(/'/g, "''")}'`;

async function baseTables(schema: string): Promise<string[]> {
  const result = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema=$1 AND table_type='BASE TABLE'`, [schema]);
  return result.rows.map((row) => row.table_name as string);
}

// Give freshly copied tables their own id counters, so one company's numbering never
// reveals (or depends on) another's. Any column still counting on a platform sequence is moved.
async function ownSequences(schema: string) {
  const shared = await pool.query(
    `SELECT c.relname AS table, a.attname AS column
     FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum
     JOIN pg_class c ON c.oid=d.adrelid JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname=$1 AND c.relkind='r' AND pg_get_expr(d.adbin, d.adrelid) LIKE 'nextval(%'
       AND pg_get_expr(d.adbin, d.adrelid) NOT LIKE '%' || $1 || '.%'`,
    [schema],
  );
  const statements = shared.rows.flatMap(({ table, column }) => {
    const sequence = `${ident(schema)}.${ident(`${table}_${column}_seq`)}`;
    return [
      `CREATE SEQUENCE IF NOT EXISTS ${sequence} OWNED BY ${ident(schema)}.${ident(table)}.${ident(column)}`,
      `ALTER TABLE ${ident(schema)}.${ident(table)} ALTER COLUMN ${ident(column)} SET DEFAULT nextval(${literal(sequence)})`,
    ];
  });
  if (statements.length) await pool.query(statements.join("; "));
}

// Add columns that appeared in `public` (a newer app version) to the tenant's existing tables.
async function addMissingColumns(schema: string) {
  const missing = await pool.query(
    `SELECT pc.relname AS table, a.attname AS column, format_type(a.atttypid, a.atttypmod) AS type, a.attnotnull AS required, pg_get_expr(d.adbin, d.adrelid) AS fallback
     FROM pg_class pc JOIN pg_namespace pn ON pn.oid=pc.relnamespace AND pn.nspname='public'
     JOIN pg_class tc ON tc.relname=pc.relname AND tc.relkind='r' JOIN pg_namespace tn ON tn.oid=tc.relnamespace AND tn.nspname=$1
     JOIN pg_attribute a ON a.attrelid=pc.oid AND a.attnum>0 AND NOT a.attisdropped
     LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
     WHERE pc.relkind='r' AND NOT EXISTS (SELECT 1 FROM pg_attribute t WHERE t.attrelid=tc.oid AND t.attname=a.attname AND NOT t.attisdropped)
     ORDER BY pc.relname, a.attnum`,
    [schema],
  );
  const statements = missing.rows.map(({ table, column, type, required, fallback }) => {
    const usesSequence = String(fallback || "").startsWith("nextval(");
    const defaultClause = fallback && !usesSequence ? ` DEFAULT ${fallback}` : "";
    // NOT NULL is only safe to copy when existing rows get a default value.
    const notNull = required && defaultClause ? " NOT NULL" : "";
    return `ALTER TABLE ${ident(schema)}.${ident(table)} ADD COLUMN IF NOT EXISTS ${ident(column)} ${type}${defaultClause}${notNull}`;
  });
  if (statements.length) await pool.query(statements.join("; "));
}

// Make a tenant schema mirror the structure of `public`: its own copy of every member-app
// table, and a view onto every BridgeX table. Safe to run repeatedly: it only creates what
// is missing and never touches data. Statements are batched, so this is a few round trips.
export async function syncTenantSchema(schema: string) {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${ident(schema)}`);
  const existing = new Set(await baseTables(schema));
  const statements: string[] = [];
  for (const table of await baseTables("public")) {
    // Views are re-created every time so columns added to a platform table show up in them.
    if (isBridgeTable(table)) statements.push(`CREATE OR REPLACE VIEW ${ident(schema)}.${ident(table)} AS SELECT * FROM public.${ident(table)}`);
    else if (!isPlatformTable(table) && !existing.has(table)) statements.push(`CREATE TABLE IF NOT EXISTS ${ident(schema)}.${ident(table)} (LIKE public.${ident(table)} INCLUDING ALL)`);
  }
  if (statements.length) await pool.query(statements.join("; "));
  await ownSequences(schema);
  await addMissingColumns(schema);
}

// The company's owners/admins get the same account inside the new data space, as its
// main admins — otherwise nobody could log in to set it up.
async function copyOwnerAccounts(schema: string, companyId: number) {
  const columns = (await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users'
     AND column_name IN (SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='users')`,
    [schema],
  )).rows.map((row) => ident(row.column_name)).join(", ");
  await pool.query(
    `INSERT INTO ${ident(schema)}.users (${columns}) SELECT ${columns} FROM public.users
     WHERE id IN (SELECT user_id FROM public.bridge_company_members WHERE company_id=$1 AND role IN ('owner','admin') AND status='active')
     ON CONFLICT DO NOTHING`,
    [companyId],
  );
  await pool.query(
    `UPDATE ${ident(schema)}.users SET role='admin' WHERE id IN (SELECT user_id FROM public.bridge_company_members WHERE company_id=$1 AND role IN ('owner','admin') AND status='active')`,
    [companyId],
  );
}

// Give a company its own data space on this server and switch it over.
export async function provisionTenantSpace(companyId: number): Promise<string> {
  const schema = schemaNameFor(companyId);
  await syncTenantSchema(schema);
  await copyOwnerAccounts(schema, companyId);
  await pool.query(`UPDATE public.bridge_companies SET data_mode='schema', db_schema=$2, updated_at=now() WHERE id=$1`, [companyId, schema]);
  registry = null;
  return schema;
}

export const DATA_MODES = ["schema", "dedicated", "shared"] as const;
export type DataMode = (typeof DATA_MODES)[number];
export const DEFAULT_DATA_MODE: DataMode = "schema";

// How a company's member-app data is kept:
//   schema    — its own data space on this server (created here, automatically)
//   dedicated — its own server + database; `serverUrl` is where its app runs
//   shared    — the platform's own tables (legacy; only Reborn belongs here)
export async function setCompanyDataMode(companyId: number, mode: DataMode, serverUrl?: string | null) {
  if (mode === "schema") { await provisionTenantSpace(companyId); return; }
  const url = mode === "dedicated" ? String(serverUrl || "").trim().replace(/\/$/, "") || null : null;
  await pool.query(`UPDATE public.bridge_companies SET data_mode=$2, server_url=$3, updated_at=now() WHERE id=$1`, [companyId, mode, url]);
  registry = null;
}

// ── Which company a request belongs to ──────────────────────────────────────
interface RegisteredTenant extends TenantSpace { domain: string | null }
let registry: { at: number; tenants: RegisteredTenant[] } | null = null;

async function tenants(): Promise<RegisteredTenant[]> {
  if (registry && Date.now() - registry.at < REGISTRY_TTL_MS) return registry.tenants;
  let result;
  try {
    result = await pool.query(`SELECT id, slug, db_schema, website_domain FROM public.bridge_companies WHERE data_mode='schema' AND db_schema IS NOT NULL`);
  } catch (error) {
    // A database blip must not send a company's visitors to the wrong data: keep the last known list.
    if (registry) return registry.tenants;
    throw error;
  }
  registry = {
    at: Date.now(),
    tenants: result.rows.map((row) => ({ companyId: row.id, slug: row.slug, schema: row.db_schema, domain: row.website_domain ? String(row.website_domain).toLowerCase() : null })),
  };
  return registry.tenants;
}

export async function listTenantSpaces(): Promise<TenantSpace[]> {
  return tenants();
}

function cookieValue(req: Request, name: string): string {
  const match = String(req.headers.cookie || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

function refererPath(req: Request): string {
  try { return new URL(String(req.headers.referer || "")).pathname; } catch { return ""; }
}

// A company's own domain always means that company. On the shared platform host the
// browser says which business it is in (header from the app, cookie for everything the
// app can't add a header to). Choosing a space grants nothing by itself: each space has
// its own accounts, so a login from one company is simply unknown in another.
export async function tenantForRequest(req: Request): Promise<TenantSpace | null> {
  const host = String(req.hostname || "").toLowerCase();
  if (FLAGSHIP_HOSTS.has(host)) return null;
  if (req.path.startsWith(PLATFORM_API_PREFIX) || refererPath(req).startsWith(PLATFORM_PAGE_PREFIX)) return null;
  const all = await tenants();
  if (!all.length) return null;
  const byDomain = all.find((tenant) => tenant.domain === host);
  if (byDomain) return byDomain;
  const slug = String(req.header("x-tenant-slug") || cookieValue(req, TENANT_COOKIE) || "").toLowerCase().trim();
  return (slug && all.find((tenant) => tenant.slug === slug)) || null;
}

type TenantRequest = Request & { tenantSpace?: TenantSpace };

export function tenantSpaceMiddleware(req: Request, _res: Response, next: NextFunction) {
  tenantForRequest(req)
    .then((tenant) => {
      if (!tenant) return next();
      (req as TenantRequest).tenantSpace = tenant;
      runInTenant(tenant, next);
    })
    .catch((error) => { console.error("[tenant] could not resolve the company for this request", error); next(error); });
}

// HACK: callback-based middleware (session store, file uploads, streams) can call `next()`
// outside the async context the request started in, which would silently send the rest of
// a tenant's request to the platform data. Express 4 runs every middleware and route
// through Layer.handle_request, so re-enter the request's data space there. The proper fix
// is Express 5 / fully promise-based middleware, where the context is never lost.
export function keepTenantContextAcrossMiddleware() {
  const require = createRequire(import.meta.url);
  const Layer = require("express/lib/router/layer");
  if (Layer.prototype.__tenantAware) return;
  for (const method of ["handle_request", "handle_error"] as const) {
    const original = Layer.prototype[method];
    Layer.prototype[method] = function tenantAware(this: unknown, ...args: any[]) {
      const req: TenantRequest | undefined = method === "handle_error" ? args[1] : args[0];
      const tenant = req?.tenantSpace;
      if (tenant && currentTenant() !== tenant) return runInTenant(tenant, () => original.apply(this, args));
      return original.apply(this, args);
    };
  }
  Layer.prototype.__tenantAware = true;
}

// Background jobs (timers) have no request to tell them whose data to work on: run the job
// for the platform's own company, then once inside every other company's data space.
export async function inEveryDataSpace(job: () => Promise<unknown>) {
  await job().catch((error) => console.error("[job] platform", error));
  for (const tenant of await tenants().catch(() => [])) {
    await runInTenant(tenant, job).catch((error) => console.error(`[job] ${tenant.schema}`, error));
  }
}

// Keep every existing data space in step with the current app version (new tables/columns).
export async function syncAllTenantSpaces() {
  for (const tenant of await tenants()) {
    try { await syncTenantSchema(tenant.schema); }
    catch (error) { console.error(`[tenant] could not update ${tenant.schema}`, error); }
  }
}
