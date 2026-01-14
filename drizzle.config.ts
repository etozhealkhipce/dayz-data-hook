import { defineConfig } from "drizzle-kit";

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
  const password = process.env.PGPASSWORD;

  if (!database || !user) {
    throw new Error(
      "Either DATABASE_URL or PGDATABASE and PGUSER must be set. Ensure the database is provisioned."
    );
  }

  // Construct connection string
  const passwordPart = password ? `:${password}` : "";
  return `postgresql://${user}${passwordPart}@${host}:${port}/${database}`;
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
