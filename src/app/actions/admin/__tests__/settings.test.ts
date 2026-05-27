/**
 * Task 5.5 RED — admin settings actions test (PGlite).
 * getAppSettings() on empty table returns { paymentFailureMode: false } and creates singleton.
 * updateFailureMode(true) persists.
 * Subsequent getAppSettings() returns { paymentFailureMode: true }.
 * Non-admin updateFailureMode returns FORBIDDEN.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
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

type TestDb = ReturnType<typeof drizzle<typeof schema>>;

async function seedUsers(db: TestDb) {
  await db.insert(schema.users).values([
    {
      id: "admin-settings-1",
      email: "admin-settings@test.cl",
      name: "Admin Settings",
      role: "admin",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "customer-settings-1",
      email: "customer-settings@test.cl",
      name: "Customer Settings",
      role: "customer",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    },
  ]);
}

describe("admin settings actions — integration (real PGlite)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getAppSettings() on empty table returns { paymentFailureMode: false } and creates singleton", async () => {
    const db = await createTestDb();

    const { getAppSettingsWithDb } = await import("@/app/actions/admin/settings");
    const result = await getAppSettingsWithDb(db as never);

    expect(result).toMatchObject({ paymentFailureMode: false });

    // Singleton row was created
    const rows = await db.select().from(schema.appSettings);
    expect(rows).toHaveLength(1);
    expect(rows[0].paymentFailureMode).toBe(false);
  });

  it("updateFailureMode(true) persists and subsequent getAppSettings returns true", async () => {
    const db = await createTestDb();
    await seedUsers(db);

    const { getAppSettingsWithDb, updateFailureModeWithDb } = await import(
      "@/app/actions/admin/settings"
    );

    const updateResult = await updateFailureModeWithDb(db as never, true, "admin-settings-1");
    expect(updateResult.ok).toBe(true);

    const settings = await getAppSettingsWithDb(db as never);
    expect(settings.paymentFailureMode).toBe(true);
  });

  it("non-admin updateFailureMode returns FORBIDDEN", async () => {
    const db = await createTestDb();
    await seedUsers(db);

    const { updateFailureModeWithDb } = await import("@/app/actions/admin/settings");

    const result = await updateFailureModeWithDb(db as never, true, "customer-settings-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });
});
