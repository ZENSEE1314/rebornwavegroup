import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import { currentTenant, tenantDb } from "./tenantContext";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const { Pool } = pg;

// The host's database proxy closes connections that sit idle; a short idle time + keep-alive means the pool drops them itself first,
// and an error on an idle connection is logged instead of taking the server down ("Connection terminated unexpectedly").
export const POOL_OPTIONS = { connectionString: process.env.DATABASE_URL, keepAlive: true, keepAliveInitialDelayMillis: 10_000, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 20_000 };
export const pool = new Pool(POOL_OPTIONS);
pool.on("error", (error) => console.error("[db] idle connection error", error.message));

// The platform's own data (`public` schema): Reborn, BridgeX, sessions.
export const platformDb = drizzle({ client: pool, schema });

// Every query goes to the data space of the company the current request belongs to
// (see server/tenantContext.ts); outside a tenant request this is the platform database.
export const db = new Proxy(platformDb, {
  get(_target, property) {
    const tenant = currentTenant();
    const database = tenant ? tenantDb(tenant.schema) : platformDb;
    const value = (database as any)[property];
    return typeof value === "function" ? value.bind(database) : value;
  },
}) as typeof platformDb;
