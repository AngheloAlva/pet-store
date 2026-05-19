import path from "node:path";
import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";
import { applySeed } from "./seed";

// Integration test — uses a real PGlite in-memory instance.
// NOT the global @/db mock — this tests the seed module itself.

async function createTestDb() {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });
  return db;
}

describe("applySeed — personas", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    db = await createTestDb();
    await applySeed(db);
  });

  it("seeds exactly 3 demo users (isDemoSeed = true) on first run", async () => {
    const demoUsers = await db.query.users.findMany({
      where: (u, { eq }) => eq(u.isDemoSeed, true),
    });
    expect(demoUsers).toHaveLength(3);
  });

  it("is idempotent — re-running applySeed does not create duplicates", async () => {
    // Run seed a second time
    await applySeed(db);
    const demoUsers = await db.query.users.findMany({
      where: (u, { eq }) => eq(u.isDemoSeed, true),
    });
    expect(demoUsers).toHaveLength(3);
  });

  it("staff persona has storeId = 'providencia'", async () => {
    const staff = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, "staff@demo.cl"),
    });
    expect(staff).toBeDefined();
    expect(staff?.storeId).toBe("providencia");
  });
});
