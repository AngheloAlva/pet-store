/**
 * T-15 [ACTION] admin/subscriptions.ts — updateSubscriptionConfigWithDb
 * T-34 [XC] Admin role guard
 * CF-S1, CF-S2, CF-S3, CF-S4
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import path from "node:path";
import * as schema from "@/db/schema";

async function createTestDb() {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

type TestDb = ReturnType<typeof drizzle<typeof schema>>;

async function seedBase(db: TestDb) {
  await db.insert(schema.users).values([
    { id: "admin-1", email: "admin@test.cl", name: "Admin", role: "admin", isDemoSeed: false, createdAt: new Date().toISOString() },
    { id: "customer-1", email: "c@test.cl", name: "Customer", role: "customer", isDemoSeed: false, createdAt: new Date().toISOString() },
  ]);
  await db.insert(schema.brands).values({ id: "brand-1", slug: "brand-1", name: "Brand 1" });
  await db.insert(schema.products).values({
    id: "prod-1",
    slug: "prod-1",
    name: "Product 1",
    brandId: "brand-1",
    description: "Test product",
  });
}

describe("updateSubscriptionConfigWithDb (T-15)", () => {
  it("CF-S1: admin enables subscription on a product with valid config", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { updateSubscriptionConfigWithDb } = await import(
      "@/app/actions/admin/subscriptions"
    );

    const result = await updateSubscriptionConfigWithDb(db as never, "admin-1", {
      productId: "prod-1",
      subscriptionEnabled: true,
      subscriptionFrequencies: [30, 60],
      subscriptionDiscountPercent: 10,
    });

    expect(result.ok).toBe(true);

    const rows = await db.select().from(schema.products).where(eq(schema.products.id, "prod-1"));
    expect(rows[0].subscriptionEnabled).toBe(true);
    expect(rows[0].subscriptionFrequencies).toEqual([30, 60]);
    expect(rows[0].subscriptionDiscountPercent).toBe(10);
  });

  it("CF-S2: disabling subscription zeroes the config", async () => {
    const db = await createTestDb();
    await seedBase(db);

    // First enable it
    await db.update(schema.products)
      .set({ subscriptionEnabled: true, subscriptionFrequencies: [30], subscriptionDiscountPercent: 5 })
      .where(eq(schema.products.id, "prod-1"));

    const { updateSubscriptionConfigWithDb } = await import(
      "@/app/actions/admin/subscriptions"
    );

    const result = await updateSubscriptionConfigWithDb(db as never, "admin-1", {
      productId: "prod-1",
      subscriptionEnabled: false,
      subscriptionFrequencies: [],
      subscriptionDiscountPercent: 0,
    });

    expect(result.ok).toBe(true);

    const rows = await db.select().from(schema.products).where(eq(schema.products.id, "prod-1"));
    expect(rows[0].subscriptionEnabled).toBe(false);
    expect(rows[0].subscriptionFrequencies).toEqual([]);
    expect(rows[0].subscriptionDiscountPercent).toBe(0);
  });

  it("CF-S3: invalid frequency (e.g. 7) is rejected", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { updateSubscriptionConfigWithDb } = await import(
      "@/app/actions/admin/subscriptions"
    );

    const result = await updateSubscriptionConfigWithDb(db as never, "admin-1", {
      productId: "prod-1",
      subscriptionEnabled: true,
      subscriptionFrequencies: [7],
      subscriptionDiscountPercent: 10,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toMatch(/VALIDATION/);
    // Verify DB row unchanged
    const rows = await db.select().from(schema.products).where(eq(schema.products.id, "prod-1"));
    expect(rows[0].subscriptionEnabled).toBe(false);
  });

  it("CF-S4: invalid discount (e.g. 15) is rejected", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { updateSubscriptionConfigWithDb } = await import(
      "@/app/actions/admin/subscriptions"
    );

    const result = await updateSubscriptionConfigWithDb(db as never, "admin-1", {
      productId: "prod-1",
      subscriptionEnabled: true,
      subscriptionFrequencies: [30],
      subscriptionDiscountPercent: 15,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toMatch(/VALIDATION/);
  });

  it("T-34: non-admin user gets FORBIDDEN", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { updateSubscriptionConfigWithDb } = await import(
      "@/app/actions/admin/subscriptions"
    );

    const result = await updateSubscriptionConfigWithDb(db as never, "customer-1", {
      productId: "prod-1",
      subscriptionEnabled: true,
      subscriptionFrequencies: [30],
      subscriptionDiscountPercent: 10,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("FORBIDDEN");
  });
});
