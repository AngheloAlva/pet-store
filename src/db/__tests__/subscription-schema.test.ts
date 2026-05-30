/**
 * T-04 [SCHEMA] Product type + sync-cache — subscription fields
 * T-05 [SCHEMA] appSettings default — subscriptionReminderDays
 * SC-S2, SC-S4
 */
import { describe, it, expect, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import * as schema from "@/db/schema";

vi.mock("@/db", () => ({
  db: {},
  dbReady: Promise.resolve(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

async function createTestDb() {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

describe("T-04: Product type includes subscription fields (SC-S2)", () => {
  it("mapProduct includes subscriptionEnabled, subscriptionFrequencies, subscriptionDiscountPercent", async () => {
    const { mapProduct } = await import("@/db/mappers");

    const row = {
      id: "p1",
      slug: "p1",
      name: "Product 1",
      brandId: "b1",
      description: "desc",
      shortDescription: null,
      species: [],
      tags: [],
      targetSize: null,
      lifeStage: null,
      ingredients: null,
      nutritionalAnalysis: null,
      featured: false,
      subscriptionEnabled: true,
      subscriptionFrequencies: [30],
      subscriptionDiscountPercent: 10,
      variants: [],
      images: [],
      productCategories: [],
    };

    const product = mapProduct(row);
    expect(product.subscriptionEnabled).toBe(true);
    expect(product.subscriptionFrequencies).toEqual([30]);
    expect(product.subscriptionDiscountPercent).toBe(10);
  });

  it("mapProduct defaults subscriptionEnabled=false and empty frequencies for non-subscription product (SC-S2 inverse)", async () => {
    const { mapProduct } = await import("@/db/mappers");

    const row = {
      id: "p2",
      slug: "p2",
      name: "Product 2",
      brandId: "b1",
      description: "desc",
      shortDescription: null,
      species: [],
      tags: [],
      targetSize: null,
      lifeStage: null,
      ingredients: null,
      nutritionalAnalysis: null,
      featured: false,
      subscriptionEnabled: false,
      subscriptionFrequencies: [],
      subscriptionDiscountPercent: 0,
      variants: [],
      images: [],
      productCategories: [],
    };

    const product = mapProduct(row);
    expect(product.subscriptionEnabled).toBe(false);
    expect(product.subscriptionFrequencies).toEqual([]);
    expect(product.subscriptionDiscountPercent).toBe(0);
  });
});

describe("T-05: appSettings subscriptionReminderDays default (SC-S4)", () => {
  it("subscriptionReminderDays column exists on appSettings schema", () => {
    expect("subscriptionReminderDays" in schema.appSettings).toBe(true);
  });

  it("getAppSettingsWithDb returns subscriptionReminderDays === 3 when singleton has default value", async () => {
    const db = await createTestDb();
    // Insert singleton with default
    await db.insert(schema.appSettings).values({ id: "singleton" });

    const { getAppSettingsWithDb } = await import("@/app/actions/admin/settings");
    const settings = await getAppSettingsWithDb(db as never);
    expect(settings.subscriptionReminderDays).toBe(3);
  });
});
