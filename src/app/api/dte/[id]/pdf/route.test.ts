/**
 * T-23 [RED] → T-24 [GREEN] — GET /api/dte/[id]/pdf route handler tests
 * Spec: P-1, P-3
 * Uses the *WithDb injection pattern + PGlite for DB integration.
 * Mocks getCurrentUser to control auth state.
 *
 * Security: IDOR ownership tests added — DTE access must be scoped to the
 * owning user via dte.orderId → orders.userId === user.id.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import * as schema from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { getDtePdfWithDb } from "@/app/api/dte/[id]/pdf/route";

const mockGetCurrentUser = vi.mocked(getCurrentUser);

async function createTestDb() {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

type TestDb = ReturnType<typeof drizzle<typeof schema>>;

const TEST_USER = {
  id: "user-pdf-test",
  email: "user@test.cl",
  name: "PDF Test User",
  role: "customer" as const,
  storeId: null,
  isDemoSeed: false,
};

const OTHER_USER = {
  id: "user-other-pdf",
  email: "other@test.cl",
  name: "Other User",
  role: "customer" as const,
  storeId: null,
  isDemoSeed: false,
};

const ADMIN_USER = {
  id: "user-admin-pdf",
  email: "admin@test.cl",
  name: "Admin User",
  role: "admin" as const,
  storeId: null,
  isDemoSeed: false,
};

type SeedUserInput = { id: string; email: string; name: string; role: "customer" | "admin" };

async function seedUser(db: TestDb, user: SeedUserInput) {
  await db.insert(schema.users).values({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isDemoSeed: false,
    createdAt: new Date().toISOString(),
  }).onConflictDoNothing();
}

async function seedOrderForUser(
  db: TestDb,
  user: SeedUserInput,
  orderId: string
) {
  // Ensure user exists first (FK constraint on checkout_sessions and orders)
  await seedUser(db, user);

  // Need a checkoutSession first (FK constraint)
  await db.insert(schema.checkoutSessions).values({
    id: `cs-${orderId}`,
    userId: user.id,
    idempotencyKey: `idem-${orderId}`,
    cartSnapshot: [],
    address: {},
    shippingOptionId: "standard",
    shippingCost: 0,
    status: "completed",
    expiresAt: new Date(Date.now() + 3600 * 1000),
  }).onConflictDoNothing();

  await db.insert(schema.orders).values({
    id: orderId,
    orderNumber: `ORD-${orderId}`,
    userId: user.id,
    checkoutSessionId: `cs-${orderId}`,
    status: "confirmed",
    paymentStatus: "paid",
    paymentGateway: "manual",
    address: {},
    shippingOptionId: "standard",
    shippingCost: 0,
    subtotal: 11900,
    total: 11900,
    discountTotal: 0,
  }).onConflictDoNothing();
}

async function seedDteDocument(
  db: TestDb,
  overrides: Partial<typeof schema.dteDocuments.$inferInsert> = {}
) {
  const dteId = overrides.id ?? "dte-pdf-test-001";

  // Insert required users first
  await seedUser(db, TEST_USER);

  await db.insert(schema.dteDocuments).values({
    id: dteId,
    dteId: dteId,
    status: "emitido",
    folio: 42,
    type: "boleta",
    documentCode: 39,
    issuedAt: new Date("2026-05-30T12:00:00Z"),
    net: 10000,
    taxAmount: 1900,
    total: 11900,
    issuerRut: "76000000-0",
    receiverRut: "66666666-6",
    receiverName: TEST_USER.name,
    stamp: "c3RhbXAtdGVzdA==",
    pdfUrl: `/api/dte/${dteId}/pdf`,
    ...overrides,
  });

  return dteId;
}

describe("getDtePdfWithDb — GET /api/dte/[id]/pdf (P-1, P-3)", () => {
  // ─── Existing tests (kept intact) ───────────────────────────────────────────

  it("P-1-a: valid id with owner returns 200 + attachment header + HTML body", async () => {
    const db = await createTestDb();
    mockGetCurrentUser.mockResolvedValue(TEST_USER);

    // Seed order owned by TEST_USER and link DTE to it
    await seedOrderForUser(db, TEST_USER, "order-owner-001");
    const dteId = await seedDteDocument(db, { id: "dte-owner-001", dteId: "dte-owner-001", orderId: "order-owner-001" });

    const response = await getDtePdfWithDb(db as never, dteId, TEST_USER);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
    const body = await response.text();
    expect(body).toContain("42"); // folio
    expect(body.length).toBeGreaterThan(100);
  });

  it("P-1: HTML body contains folio number", async () => {
    const db = await createTestDb();

    await seedOrderForUser(db, TEST_USER, "order-folio-check");
    const dteId = await seedDteDocument(db, {
      id: "dte-folio-check",
      dteId: "dte-folio-check",
      folio: 99,
      orderId: "order-folio-check",
    });

    const response = await getDtePdfWithDb(db as never, dteId, TEST_USER);

    const body = await response.text();
    expect(body).toContain("99");
  });

  it("P-1: HTML body contains total amount", async () => {
    const db = await createTestDb();

    await seedOrderForUser(db, TEST_USER, "order-total-check");
    const dteId = await seedDteDocument(db, { orderId: "order-total-check" });

    const response = await getDtePdfWithDb(db as never, dteId, TEST_USER);

    const body = await response.text();
    // 11900 formatted as CLP → "11.900"
    expect(body).toContain("11.900");
  });

  it("P-1-b: unknown id returns 404", async () => {
    const db = await createTestDb();

    const response = await getDtePdfWithDb(db as never, "non-existent-id", TEST_USER);

    expect(response.status).toBe(404);
  });

  it("P-3: Content-Disposition filename includes type and folio", async () => {
    const db = await createTestDb();

    await seedOrderForUser(db, TEST_USER, "order-cd-check");
    const dteId = await seedDteDocument(db, { orderId: "order-cd-check" });

    const response = await getDtePdfWithDb(db as never, dteId, TEST_USER);

    const disposition = response.headers.get("Content-Disposition") ?? "";
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("boleta");
    expect(disposition).toContain("42");
  });

  it("P-1: unauthenticated (null user) returns 401", async () => {
    const db = await createTestDb();
    const dteId = await seedDteDocument(db);

    const response = await getDtePdfWithDb(db as never, dteId, null);

    expect(response.status).toBe(401);
  });

  // ─── SECURITY: IDOR ownership tests ─────────────────────────────────────────

  it("SEC-1: admin can download any DTE regardless of ownership", async () => {
    const db = await createTestDb();
    await seedUser(db, ADMIN_USER);

    // DTE is owned by TEST_USER's order
    await seedOrderForUser(db, TEST_USER, "order-admin-test");
    const dteId = await seedDteDocument(db, {
      id: "dte-admin-test",
      dteId: "dte-admin-test",
      orderId: "order-admin-test",
    });

    const response = await getDtePdfWithDb(db as never, dteId, ADMIN_USER);

    expect(response.status).toBe(200);
  });

  it("SEC-2: non-admin owner (matching order.userId) can download their own DTE", async () => {
    const db = await createTestDb();

    await seedOrderForUser(db, TEST_USER, "order-sec2");
    const dteId = await seedDteDocument(db, {
      id: "dte-sec2",
      dteId: "dte-sec2",
      orderId: "order-sec2",
    });

    const response = await getDtePdfWithDb(db as never, dteId, TEST_USER);

    expect(response.status).toBe(200);
  });

  it("SEC-3: non-admin user requesting another user's DTE → 403 (IDOR block)", async () => {
    const db = await createTestDb();
    await seedUser(db, OTHER_USER);

    // DTE belongs to TEST_USER's order, OTHER_USER tries to access it
    await seedOrderForUser(db, TEST_USER, "order-sec3");
    const dteId = await seedDteDocument(db, {
      id: "dte-sec3",
      dteId: "dte-sec3",
      orderId: "order-sec3",
    });

    const response = await getDtePdfWithDb(db as never, dteId, OTHER_USER);

    expect(response.status).toBe(403);
  });

  it("SEC-4: non-admin requesting NC/ND with null orderId → 403", async () => {
    const db = await createTestDb();

    // NC/ND has no orderId (admin-only artifact)
    const dteId = await seedDteDocument(db, {
      id: "dte-sec4-nc",
      dteId: "dte-sec4-nc",
      type: "nota_credito",
      documentCode: 61,
      orderId: undefined,
    });

    const response = await getDtePdfWithDb(db as never, dteId, TEST_USER);

    expect(response.status).toBe(403);
  });

  it("SEC-5: non-existent DTE id → 404 (not 403, no existence leak)", async () => {
    const db = await createTestDb();

    const response = await getDtePdfWithDb(db as never, "does-not-exist", TEST_USER);

    expect(response.status).toBe(404);
  });
});
