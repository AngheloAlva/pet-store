/**
 * T-10..T-14 [ACTION] suscripciones.ts — cuenta subscription CRUD
 * T-33 [XC] Auth guard audit
 * SP-S4, SP-S5, SP-S8, SM-S1, SM-S2, SM-S3, SM-S4, SM-S5, SM-S6, SM-S7,
 * SM-S8, SM-S9, SM-S10, SM-S11, SM-S12, XC-2
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
    { id: "user-a", email: "a@test.cl", name: "User A", role: "customer", isDemoSeed: false, createdAt: new Date().toISOString() },
    { id: "user-b", email: "b@test.cl", name: "User B", role: "customer", isDemoSeed: false, createdAt: new Date().toISOString() },
  ]);
  await db.insert(schema.brands).values({ id: "brand-1", slug: "brand-1", name: "Brand 1" });
  await db.insert(schema.products).values({
    id: "prod-1",
    slug: "prod-1",
    name: "Product 1",
    brandId: "brand-1",
    description: "Test product",
    subscriptionEnabled: true,
    subscriptionFrequencies: [30, 60],
    subscriptionDiscountPercent: 10,
  });
  await db.insert(schema.productVariants).values([
    { id: "var-1", productId: "prod-1", sku: "SKU-1", name: "Variant 1", quantityValue: "1.000", quantityUnit: "kg", priceAmount: 10000, priceCurrency: "CLP" },
    { id: "var-2", productId: "prod-1", sku: "SKU-2", name: "Variant 2", quantityValue: "2.000", quantityUnit: "kg", priceAmount: 18000, priceCurrency: "CLP" },
  ]);
}

const now = new Date("2026-06-01T12:00:00Z");
const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

// ---------------------------------------------------------------------------
// T-10: createSubscriptionWithDb
// ---------------------------------------------------------------------------
describe("createSubscriptionWithDb (T-10)", () => {
  it("SP-S4: creates subscription row with correct fields on success", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { createSubscriptionWithDb } = await import(
      "@/app/actions/cuenta/suscripciones"
    );

    const result = await createSubscriptionWithDb(db as never, {
      userId: "user-a",
      productId: "prod-1",
      variantId: "var-1",
      frequencyDays: 30,
      discountPercent: 10,
      now,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const rows = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.id, result.subscriptionId));

    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe("user-a");
    expect(rows[0].productId).toBe("prod-1");
    expect(rows[0].variantId).toBe("var-1");
    expect(rows[0].frequencyDays).toBe(30);
    expect(rows[0].discountPercent).toBe(10);
    expect(rows[0].status).toBe("active");
    // nextChargeAt ≈ now + 30 days (within 60s tolerance)
    const diff = Math.abs(rows[0].nextChargeAt.getTime() - futureDate.getTime());
    expect(diff).toBeLessThan(60_000);
  });

  it("SP-S8: returns validation error when frequency is not in product's allowed list", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { createSubscriptionWithDb } = await import(
      "@/app/actions/cuenta/suscripciones"
    );

    const result = await createSubscriptionWithDb(db as never, {
      userId: "user-a",
      productId: "prod-1",
      variantId: "var-1",
      frequencyDays: 45, // not in [30, 60]
      discountPercent: 10,
      now,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_FREQUENCY");
  });
});

// ---------------------------------------------------------------------------
// T-11: getSubscriptionsWithDb + getSubscriptionWithDb (cross-user guard)
// ---------------------------------------------------------------------------
describe("getSubscriptionsWithDb + getSubscriptionWithDb (T-11)", () => {
  it("SM-S1: list returns only own subscriptions", async () => {
    const db = await createTestDb();
    await seedBase(db);

    await db.insert(schema.subscriptions).values([
      { id: "sub-a1", userId: "user-a", productId: "prod-1", variantId: "var-1", frequencyDays: 30, discountPercent: 10, status: "active", nextChargeAt: futureDate },
      { id: "sub-a2", userId: "user-a", productId: "prod-1", variantId: "var-2", frequencyDays: 60, discountPercent: 10, status: "paused", nextChargeAt: futureDate },
      { id: "sub-b1", userId: "user-b", productId: "prod-1", variantId: "var-1", frequencyDays: 30, discountPercent: 10, status: "active", nextChargeAt: futureDate },
    ]);

    const { getSubscriptionsWithDb } = await import(
      "@/app/actions/cuenta/suscripciones"
    );

    const result = await getSubscriptionsWithDb(db as never, "user-a");
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.userId === "user-a")).toBe(true);
  });

  it("SM-S2: getSubscriptionWithDb returns null for foreign subscription", async () => {
    const db = await createTestDb();
    await seedBase(db);

    await db.insert(schema.subscriptions).values({
      id: "sub-b1",
      userId: "user-b",
      productId: "prod-1",
      variantId: "var-1",
      frequencyDays: 30,
      discountPercent: 10,
      status: "active",
      nextChargeAt: futureDate,
    });

    const { getSubscriptionWithDb } = await import(
      "@/app/actions/cuenta/suscripciones"
    );

    const result = await getSubscriptionWithDb(db as never, "user-a", "sub-b1");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// T-12: pauseSubscriptionWithDb + resumeSubscriptionWithDb
// ---------------------------------------------------------------------------
describe("pauseSubscriptionWithDb + resumeSubscriptionWithDb (T-12)", () => {
  it("SM-S3: cross-user pause returns NOT_FOUND", async () => {
    const db = await createTestDb();
    await seedBase(db);

    await db.insert(schema.subscriptions).values({
      id: "sub-b1",
      userId: "user-b",
      productId: "prod-1",
      variantId: "var-1",
      frequencyDays: 30,
      discountPercent: 10,
      status: "active",
      nextChargeAt: futureDate,
    });

    const { pauseSubscriptionWithDb } = await import(
      "@/app/actions/cuenta/suscripciones"
    );

    const result = await pauseSubscriptionWithDb(db as never, "user-a", "sub-b1", { type: "indefinite" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NOT_FOUND");
  });

  it("SM-S5: pause for 1 cycle sets pausedUntil = nextChargeAt + frequency", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const nextChargeAt = new Date("2026-07-01T12:00:00Z");
    await db.insert(schema.subscriptions).values({
      id: "sub-a1",
      userId: "user-a",
      productId: "prod-1",
      variantId: "var-1",
      frequencyDays: 30,
      discountPercent: 10,
      status: "active",
      nextChargeAt,
    });

    const { pauseSubscriptionWithDb } = await import(
      "@/app/actions/cuenta/suscripciones"
    );

    const result = await pauseSubscriptionWithDb(db as never, "user-a", "sub-a1", { type: "one_cycle" });
    expect(result.ok).toBe(true);

    const rows = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.id, "sub-a1"));
    expect(rows[0].status).toBe("paused");
    // pausedUntil = nextChargeAt + 30 days
    const expectedPausedUntil = new Date(nextChargeAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    const diff = Math.abs((rows[0].pausedUntil?.getTime() ?? 0) - expectedPausedUntil.getTime());
    expect(diff).toBeLessThan(60_000);
  });

  it("SM-S6: indefinite pause sets status=paused with pausedUntil=null", async () => {
    const db = await createTestDb();
    await seedBase(db);

    await db.insert(schema.subscriptions).values({
      id: "sub-a1",
      userId: "user-a",
      productId: "prod-1",
      variantId: "var-1",
      frequencyDays: 30,
      discountPercent: 10,
      status: "active",
      nextChargeAt: futureDate,
    });

    const { pauseSubscriptionWithDb } = await import(
      "@/app/actions/cuenta/suscripciones"
    );

    const result = await pauseSubscriptionWithDb(db as never, "user-a", "sub-a1", { type: "indefinite" });
    expect(result.ok).toBe(true);

    const rows = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.id, "sub-a1"));
    expect(rows[0].status).toBe("paused");
    expect(rows[0].pausedUntil).toBeNull();
  });

  it("SM-S7: resume clears pausedUntil and recalculates nextChargeAt", async () => {
    const db = await createTestDb();
    await seedBase(db);

    await db.insert(schema.subscriptions).values({
      id: "sub-a1",
      userId: "user-a",
      productId: "prod-1",
      variantId: "var-1",
      frequencyDays: 30,
      discountPercent: 10,
      status: "paused",
      nextChargeAt: futureDate,
    });

    const { resumeSubscriptionWithDb } = await import(
      "@/app/actions/cuenta/suscripciones"
    );

    const resumeNow = new Date("2026-06-01T12:00:00Z");
    const result = await resumeSubscriptionWithDb(db as never, "user-a", "sub-a1", resumeNow);
    expect(result.ok).toBe(true);

    const rows = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.id, "sub-a1"));
    expect(rows[0].status).toBe("active");
    expect(rows[0].pausedUntil).toBeNull();
    // nextChargeAt ≈ resumeNow + 30 days
    const expectedNextCharge = new Date(resumeNow.getTime() + 30 * 24 * 60 * 60 * 1000);
    const diff = Math.abs(rows[0].nextChargeAt.getTime() - expectedNextCharge.getTime());
    expect(diff).toBeLessThan(60_000);
  });
});

// ---------------------------------------------------------------------------
// T-13: changeFrequencyWithDb + changeVariantWithDb
// ---------------------------------------------------------------------------
describe("changeFrequencyWithDb + changeVariantWithDb (T-13)", () => {
  it("SM-S8: valid frequency change updates frequency and nextChargeAt", async () => {
    const db = await createTestDb();
    await seedBase(db);

    await db.insert(schema.subscriptions).values({
      id: "sub-a1",
      userId: "user-a",
      productId: "prod-1",
      variantId: "var-1",
      frequencyDays: 30,
      discountPercent: 10,
      status: "active",
      nextChargeAt: futureDate,
    });

    const { changeFrequencyWithDb } = await import(
      "@/app/actions/cuenta/suscripciones"
    );

    const changeNow = new Date("2026-06-01T12:00:00Z");
    const result = await changeFrequencyWithDb(db as never, "user-a", "sub-a1", 60, changeNow);
    expect(result.ok).toBe(true);

    const rows = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.id, "sub-a1"));
    expect(rows[0].frequencyDays).toBe(60);
    // nextChargeAt ≈ now + 60 days
    const expectedNextCharge = new Date(changeNow.getTime() + 60 * 24 * 60 * 60 * 1000);
    const diff = Math.abs(rows[0].nextChargeAt.getTime() - expectedNextCharge.getTime());
    expect(diff).toBeLessThan(60_000);
  });

  it("SM-S9: invalid frequency returns INVALID_FREQUENCY error", async () => {
    const db = await createTestDb();
    await seedBase(db);

    await db.insert(schema.subscriptions).values({
      id: "sub-a1",
      userId: "user-a",
      productId: "prod-1",
      variantId: "var-1",
      frequencyDays: 30,
      discountPercent: 10,
      status: "active",
      nextChargeAt: futureDate,
    });

    const { changeFrequencyWithDb } = await import(
      "@/app/actions/cuenta/suscripciones"
    );

    const result = await changeFrequencyWithDb(db as never, "user-a", "sub-a1", 45, now);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_FREQUENCY");

    // Verify subscription unchanged
    const rows = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.id, "sub-a1"));
    expect(rows[0].frequencyDays).toBe(30);
  });

  it("SM-S10: variant change succeeds for same-product variant", async () => {
    const db = await createTestDb();
    await seedBase(db);

    await db.insert(schema.subscriptions).values({
      id: "sub-a1",
      userId: "user-a",
      productId: "prod-1",
      variantId: "var-1",
      frequencyDays: 30,
      discountPercent: 10,
      status: "active",
      nextChargeAt: futureDate,
    });

    const { changeVariantWithDb } = await import(
      "@/app/actions/cuenta/suscripciones"
    );

    const result = await changeVariantWithDb(db as never, "user-a", "sub-a1", "var-2");
    expect(result.ok).toBe(true);

    const rows = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.id, "sub-a1"));
    expect(rows[0].variantId).toBe("var-2");
  });
});

// ---------------------------------------------------------------------------
// T-14: cancelSubscriptionWithDb
// ---------------------------------------------------------------------------
describe("cancelSubscriptionWithDb (T-14)", () => {
  it("SM-S4: cross-user cancel returns NOT_FOUND", async () => {
    const db = await createTestDb();
    await seedBase(db);

    await db.insert(schema.subscriptions).values({
      id: "sub-b1",
      userId: "user-b",
      productId: "prod-1",
      variantId: "var-1",
      frequencyDays: 30,
      discountPercent: 10,
      status: "active",
      nextChargeAt: futureDate,
    });

    const { cancelSubscriptionWithDb } = await import(
      "@/app/actions/cuenta/suscripciones"
    );

    const result = await cancelSubscriptionWithDb(db as never, "user-a", "sub-b1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NOT_FOUND");
  });

  it("SM-S11: cancel sets status=cancelled", async () => {
    const db = await createTestDb();
    await seedBase(db);

    await db.insert(schema.subscriptions).values({
      id: "sub-a1",
      userId: "user-a",
      productId: "prod-1",
      variantId: "var-1",
      frequencyDays: 30,
      discountPercent: 10,
      status: "active",
      nextChargeAt: futureDate,
    });

    const { cancelSubscriptionWithDb } = await import(
      "@/app/actions/cuenta/suscripciones"
    );

    const result = await cancelSubscriptionWithDb(db as never, "user-a", "sub-a1");
    expect(result.ok).toBe(true);

    const rows = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.id, "sub-a1"));
    expect(rows[0].status).toBe("cancelled");
  });
});

// ---------------------------------------------------------------------------
// T-33 [XC] Auth guard audit — unauthenticated calls return UNAUTHENTICATED
// XC-2: all thin wrapper server actions guard with getCurrentUser()
// ---------------------------------------------------------------------------
import { getCurrentUser } from "@/lib/session";

const mockGetCurrentUser = vi.mocked(getCurrentUser);

describe("T-33 Auth guard audit — thin wrappers", () => {
  it("createSubscription: unauthenticated → UNAUTHENTICATED", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    const { createSubscription } = await import("@/app/actions/cuenta/suscripciones");
    const result = await createSubscription({
      productId: "prod-1",
      variantId: "var-1",
      frequencyDays: 30,
      discountPercent: 10,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("UNAUTHENTICATED");
  });

  it("pauseSubscription: unauthenticated → UNAUTHENTICATED", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    const { pauseSubscription } = await import("@/app/actions/cuenta/suscripciones");
    const result = await pauseSubscription("sub-x", { type: "indefinite" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("UNAUTHENTICATED");
  });

  it("resumeSubscription: unauthenticated → UNAUTHENTICATED", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    const { resumeSubscription } = await import("@/app/actions/cuenta/suscripciones");
    const result = await resumeSubscription("sub-x");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("UNAUTHENTICATED");
  });

  it("cancelSubscription: unauthenticated → UNAUTHENTICATED", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    const { cancelSubscription } = await import("@/app/actions/cuenta/suscripciones");
    const result = await cancelSubscription("sub-x");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("UNAUTHENTICATED");
  });

  it("changeFrequency: unauthenticated → UNAUTHENTICATED", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    const { changeFrequency } = await import("@/app/actions/cuenta/suscripciones");
    const result = await changeFrequency("sub-x", 30);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("UNAUTHENTICATED");
  });

  it("changeVariant: unauthenticated → UNAUTHENTICATED", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    const { changeVariant } = await import("@/app/actions/cuenta/suscripciones");
    const result = await changeVariant("sub-x", "var-y");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("UNAUTHENTICATED");
  });
});
