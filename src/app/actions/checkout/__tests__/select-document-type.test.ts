/**
 * T-17 [RED] — selectDocumentType server action validation tests.
 * documentType='factura' without receiverRut → Zod validation error.
 * Valid factura data → session updated with documentType + receiver.
 * documentType='boleta' → session updated (no RUT required).
 * Spec: C-1, C-2, C-3, INV-4
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

async function createTestDb() {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

type TestDb = ReturnType<typeof drizzle<typeof schema>>;

async function seedBase(db: TestDb) {
  await db.insert(schema.users).values({
    id: "user-doctype-1",
    email: "doctype@test.cl",
    name: "DocType User",
    role: "customer",
    isDemoSeed: false,
    createdAt: new Date().toISOString(),
  });

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await db.insert(schema.checkoutSessions).values({
    id: "sess-doctype-1",
    userId: "user-doctype-1",
    idempotencyKey: "idem-doctype-1",
    cartSnapshot: [],
    status: "active",
    expiresAt,
  });
}

describe("selectDocumentType — integration (real PGlite)", () => {
  it("C-2-a: factura without receiverRut returns validation error", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { selectDocumentTypeWithDb } = await import(
      "@/app/actions/checkout/select-document-type"
    );

    const result = await selectDocumentTypeWithDb(db as never, {
      sessionId: "sess-doctype-1",
      userId: "user-doctype-1",
      documentType: "factura",
      receiverRut: "",
      receiverBusinessLine: "Comercio",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("VALIDATION_ERROR");
    }
  });

  it("C-2-a: factura with invalid RUT format returns validation error", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { selectDocumentTypeWithDb } = await import(
      "@/app/actions/checkout/select-document-type"
    );

    const result = await selectDocumentTypeWithDb(db as never, {
      sessionId: "sess-doctype-1",
      userId: "user-doctype-1",
      documentType: "factura",
      receiverRut: "not-a-rut",
      receiverBusinessLine: "Comercio",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("VALIDATION_ERROR");
    }
  });

  it("C-2-b: valid factura data saves documentType + receiver to session", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { selectDocumentTypeWithDb } = await import(
      "@/app/actions/checkout/select-document-type"
    );

    const result = await selectDocumentTypeWithDb(db as never, {
      sessionId: "sess-doctype-1",
      userId: "user-doctype-1",
      documentType: "factura",
      receiverRut: "12345678-9",
      receiverBusinessLine: "Comercio",
    });

    expect(result.ok).toBe(true);

    // Verify session was updated
    const sessions = await db.select().from(schema.checkoutSessions);
    expect(sessions[0].documentType).toBe("factura");
    const receiver = sessions[0].receiver as { rut: string; businessLine: string } | null;
    expect(receiver?.rut).toBe("12345678-9");
    expect(receiver?.businessLine).toBe("Comercio");
  });

  it("C-1-a: boleta selection saves documentType without requiring RUT", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { selectDocumentTypeWithDb } = await import(
      "@/app/actions/checkout/select-document-type"
    );

    const result = await selectDocumentTypeWithDb(db as never, {
      sessionId: "sess-doctype-1",
      userId: "user-doctype-1",
      documentType: "boleta",
    });

    expect(result.ok).toBe(true);

    const sessions = await db.select().from(schema.checkoutSessions);
    expect(sessions[0].documentType).toBe("boleta");
  });

  it("INV-4: factura without receiverBusinessLine returns validation error", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { selectDocumentTypeWithDb } = await import(
      "@/app/actions/checkout/select-document-type"
    );

    const result = await selectDocumentTypeWithDb(db as never, {
      sessionId: "sess-doctype-1",
      userId: "user-doctype-1",
      documentType: "factura",
      receiverRut: "12345678-9",
      receiverBusinessLine: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("VALIDATION_ERROR");
    }
  });
});
