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

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
