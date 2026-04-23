import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // DATABASE_URL must be set when running db:push / db:migrate.
    // db:generate only reads the schema file — no live connection needed.
    url: process.env.DATABASE_URL ?? "postgresql://placeholder",
  },
});
