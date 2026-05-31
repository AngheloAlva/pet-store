/**
 * T-23 [RED] → T-24 [GREEN] — GET /api/dte/[id]/pdf route handler tests
 * Spec: P-1, P-3
 * Uses the *WithDb injection pattern + PGlite for DB integration.
 * Mocks getCurrentUser to control auth state.
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

const ADMIN_USER = {
  id: "user-admin-pdf",
  email: "admin@test.cl",
  name: "Admin User",
  role: "admin" as const,
  storeId: null,
  isDemoSeed: false,
};

async function seedDteDocument(
  db: TestDb,
  overrides: Partial<typeof schema.dteDocuments.$inferInsert> = {}
) {
  const dteId = overrides.id ?? "dte-pdf-test-001";

  // Insert required users first
  await db.insert(schema.users).values({
    id: TEST_USER.id,
    email: TEST_USER.email,
    name: TEST_USER.name,
    role: "customer",
    isDemoSeed: false,
    createdAt: new Date().toISOString(),
  }).onConflictDoNothing();

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
    receiverRut: TEST_USER.id,
    receiverName: TEST_USER.name,
    stamp: "c3RhbXAtdGVzdA==",
    pdfUrl: `/api/dte/${dteId}/pdf`,
    ...overrides,
  });

  return dteId;
}

describe("getDtePdfWithDb — GET /api/dte/[id]/pdf (P-1, P-3)", () => {
  it("P-1-a: valid id with owner returns 200 + attachment header + HTML body", async () => {
    const db = await createTestDb();
    mockGetCurrentUser.mockResolvedValue(TEST_USER);
    const dteId = await seedDteDocument(db);

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
    const dteId = await seedDteDocument(db, { id: "dte-folio-check", dteId: "dte-folio-check", folio: 99 });

    const response = await getDtePdfWithDb(db as never, dteId, TEST_USER);

    const body = await response.text();
    expect(body).toContain("99");
  });

  it("P-1: HTML body contains total amount", async () => {
    const db = await createTestDb();
    const dteId = await seedDteDocument(db);

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
    const dteId = await seedDteDocument(db);

    const response = await getDtePdfWithDb(db as never, dteId, TEST_USER);

    const disposition = response.headers.get("Content-Disposition") ?? "";
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("boleta");
    expect(disposition).toContain("42");
  });

  it("P-1: admin user can access any DTE", async () => {
    const db = await createTestDb();
    // Seed admin user
    await db.insert(schema.users).values({
      id: ADMIN_USER.id,
      email: ADMIN_USER.email,
      name: ADMIN_USER.name,
      role: "admin",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    }).onConflictDoNothing();

    const dteId = await seedDteDocument(db);

    const response = await getDtePdfWithDb(db as never, dteId, ADMIN_USER);

    expect(response.status).toBe(200);
  });

  it("P-1: unauthenticated (null user) returns 401", async () => {
    const db = await createTestDb();
    const dteId = await seedDteDocument(db);

    const response = await getDtePdfWithDb(db as never, dteId, null);

    expect(response.status).toBe(401);
  });
});
