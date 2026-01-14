import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

function getDatabaseUrl(): string {
  // Prefer DATABASE_URL if set
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Otherwise, construct from individual PG variables
  const host = process.env.PGHOST || "localhost";
  const port = process.env.PGPORT || "5432";
  const database = process.env.PGDATABASE;
  const user = process.env.PGUSER;
  const password = process.env.POSTGRES_PASSWORD;

  if (!database || !user) {
    throw new Error(
      "Either DATABASE_URL or PGDATABASE and PGUSER must be set. Did you forget to provision a database?"
    );
  }

  // Construct connection string
  const passwordPart = password ? `:${password}` : "";
  return `postgresql://${user}${passwordPart}@${host}:${port}/${database}`;
}

export const pool = new Pool({ connectionString: getDatabaseUrl() });
export const db = drizzle(pool, { schema });
