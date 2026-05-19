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

// ---------------------------------------------------------------------------
// S-SEED-1: F2.4 Pets + Points seed determinism
// ---------------------------------------------------------------------------
describe("applySeed — pets + points (S-SEED-1)", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    db = await createTestDb();
    await applySeed(db);
  });

  it("Camila's points balance equals exactly 2500 after seed", async () => {
    const { pointsTransactions } = await import("./schema");
    const { desc, eq } = await import("drizzle-orm");
    const rows = await db
      .select({ balanceAfter: pointsTransactions.balanceAfter })
      .from(pointsTransactions)
      .where(eq(pointsTransactions.userId, "user-camila-demo"))
      .orderBy(desc(pointsTransactions.createdAt))
      .limit(1);
    expect(rows[0]?.balanceAfter).toBe(2500);
  });

  it("Tobi pet exists for Camila", async () => {
    const { pets } = await import("./schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db
      .select()
      .from(pets)
      .where(eq(pets.userId, "user-camila-demo"));
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Tobi");
    expect(rows[0].id).toBe("pet-tobi-camila");
  });

  it("no appointment has petNameSnapshot = 'Firulais'", async () => {
    const { appointments } = await import("./schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db
      .select({ snapshot: appointments.petNameSnapshot })
      .from(appointments)
      .where(eq(appointments.petNameSnapshot, "Firulais"));
    expect(rows).toHaveLength(0);
  });

  it("Camila's appointments reference Tobi", async () => {
    const { appointments } = await import("./schema");
    const { eq, and } = await import("drizzle-orm");
    const rows = await db
      .select({ petId: appointments.petId, snapshot: appointments.petNameSnapshot })
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, "user-camila-demo"),
          eq(appointments.petNameSnapshot, "Tobi"),
        ),
      );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.petId).toBe("pet-tobi-camila");
    }
  });

  it("points_config singleton exists with correct defaults", async () => {
    const { pointsConfig } = await import("./schema");
    const { eq } = await import("drizzle-orm");
    const [config] = await db
      .select()
      .from(pointsConfig)
      .where(eq(pointsConfig.id, "singleton"));
    expect(config).toBeDefined();
    expect(config.earnRatePerCLP).toBe(100);
    expect(config.firstPurchaseBonus).toBe(500);
    expect(config.petBirthdayBonus).toBe(200);
  });
});
