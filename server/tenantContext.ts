import { AsyncLocalStorage } from "node:async_hooks";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

// A company with its own data space: a private Postgres schema holding its own copy of
// every member-app table (users, balances, bookings, POS, songs, settings…). While a
// request runs inside `runInTenant`, the shared `db` export (server/db.ts) talks to that
// schema, so every existing query is isolated without being rewritten. The schema is the
// ONLY thing on the search path: a table that is missing there fails loudly instead of
// quietly reading another company's rows. Platform tables (bridge_*) are reachable through
// views that server/tenantSpace.ts creates in each schema.
export interface TenantSpace {
  companyId: number;
  slug: string;
  schema: string;
  // What the company calls itself; built-in texts say this instead of "Reborn".
  name?: string;
}

const TENANT_POOL_MAX = 5;
const SCHEMA_NAME = /^tenant_\d+$/;

const store = new AsyncLocalStorage<TenantSpace>();
const databases = new Map<string, ReturnType<typeof drizzle<typeof schema>>>();

export const schemaNameFor = (companyId: number) => `tenant_${companyId}`;

const REBORN_SLUG = "reborn-wave-group";
const SLUG = /^[a-z0-9-]+$/;
const configuredSlug = String(process.env.DEFAULT_COMPANY_SLUG || "").toLowerCase();

// The company this deployment serves when a request names no other: Reborn on the main
// platform, or the company a dedicated server was set up for (DEFAULT_COMPANY_SLUG).
export const DEFAULT_COMPANY_SLUG = SLUG.test(configuredSlug) ? configuredSlug : REBORN_SLUG;
export const IS_REBORN_DEPLOYMENT = DEFAULT_COMPANY_SLUG === REBORN_SLUG;

// The company whose data the current code is working in.
export function homeCompanySlug(): string {
  return store.getStore()?.slug ?? DEFAULT_COMPANY_SLUG;
}

export function currentTenant(): TenantSpace | undefined {
  return store.getStore();
}

export function runInTenant<T>(tenant: TenantSpace, fn: () => T): T {
  return store.run(tenant, fn);
}

// The drizzle instance for a tenant schema: its own small pool whose connections resolve
// unqualified table names in the tenant schema only.
export function tenantDb(schemaName: string) {
  if (!SCHEMA_NAME.test(schemaName)) throw new Error(`Invalid tenant schema: ${schemaName}`);
  let database = databases.get(schemaName);
  if (!database) {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: TENANT_POOL_MAX });
    // Queued ahead of the first query on every new connection (pg runs a client's queries in order).
    pool.on("connect", (client) => { client.query(`SET search_path TO ${schemaName}`).catch((err) => console.error(`[tenant] search_path ${schemaName}`, err)); });
    database = drizzle({ client: pool, schema });
    databases.set(schemaName, database);
  }
  return database;
}
