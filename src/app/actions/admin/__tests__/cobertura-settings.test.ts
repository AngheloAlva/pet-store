/**
 * Task 6.5 RED — cobertura settings actions tests (PGlite).
 * AS-1a: updateCoberturaSettings persists coveredCommunes, freeShippingThreshold, dispatchSlots.
 * AS-1b: invalid threshold (non-positive) returns VALIDATION_ERROR.
 * AS-1c: non-admin returns FORBIDDEN.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import * as schema from "@/db/schema";

async function createTestDb() {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

async function seedUsers(db: ReturnType<typeof drizzle<typeof schema>>) {
  await db.insert(schema.users).values([
    {
      id: "admin-cob-1",
      email: "admin-cob@test.cl",
      name: "Admin Cob",
      role: "admin",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "customer-cob-1",
      email: "customer-cob@test.cl",
      name: "Customer Cob",
      role: "customer",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    },
  ]);
}

describe("updateCoberturaSettings — integration (PGlite)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AS-1a: persists coveredCommunes, freeShippingThreshold, dispatchSlots", async () => {
    const db = await createTestDb();
    await seedUsers(db);

    const { updateCoberturaSettingsWithDb, getAppSettingsWithDb } = await import(
      "@/app/actions/admin/settings"
    );

    const result = await updateCoberturaSettingsWithDb(db as never, "admin-cob-1", {
      coveredCommunes: ["Providencia", "Las Condes"],
      freeShippingThreshold: 20000,
      dispatchSlots: ["manana", "tarde"],
    });

    expect(result.ok).toBe(true);

    const settings = await getAppSettingsWithDb(db as never);
    expect(settings.coveredCommunes).toEqual(["Providencia", "Las Condes"]);
    expect(settings.freeShippingThreshold).toBe(20000);
    expect(settings.dispatchSlots).toEqual(["manana", "tarde"]);
  });

  it("AS-1b: non-positive freeShippingThreshold returns VALIDATION_ERROR", async () => {
    const db = await createTestDb();
    await seedUsers(db);

    const { updateCoberturaSettingsWithDb } = await import(
      "@/app/actions/admin/settings"
    );

    const result = await updateCoberturaSettingsWithDb(db as never, "admin-cob-1", {
      coveredCommunes: ["Providencia"],
      freeShippingThreshold: 0,
      dispatchSlots: ["manana"],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("VALIDATION_ERROR");
    }
  });

  it("AS-1b: negative threshold returns VALIDATION_ERROR", async () => {
    const db = await createTestDb();
    await seedUsers(db);

    const { updateCoberturaSettingsWithDb } = await import(
      "@/app/actions/admin/settings"
    );

    const result = await updateCoberturaSettingsWithDb(db as never, "admin-cob-1", {
      coveredCommunes: ["Providencia"],
      freeShippingThreshold: -100,
      dispatchSlots: ["manana"],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("VALIDATION_ERROR");
    }
  });

  it("AS-1c: non-admin returns FORBIDDEN", async () => {
    const db = await createTestDb();
    await seedUsers(db);

    const { updateCoberturaSettingsWithDb } = await import(
      "@/app/actions/admin/settings"
    );

    const result = await updateCoberturaSettingsWithDb(db as never, "customer-cob-1", {
      coveredCommunes: ["Providencia"],
      freeShippingThreshold: 20000,
      dispatchSlots: ["manana"],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });
});
