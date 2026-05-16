import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";
import { applySeed } from "./seed";

declare global {
  var __pglite: PGlite | undefined;
  var __pgliteReady: Promise<void> | undefined;
}

const pglite = globalThis.__pglite ?? new PGlite();
globalThis.__pglite = pglite;

export const db = drizzle(pglite, { schema });

async function boot(): Promise<void> {
  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });
  await applySeed(db);
}

export const dbReady: Promise<void> =
  globalThis.__pgliteReady ?? boot();
globalThis.__pgliteReady = dbReady;
