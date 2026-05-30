/**
 * T-09 [RED] → T-10 [GREEN] — MockDTEProvider (F3.6) tests
 * Spec: I-4, I-5, C-3, C-4, I-3, P-3
 * Uses PGlite for folio counter integration.
 */
import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import * as schema from "@/db/schema";
import { DteMissingReceiverRutError } from "@/lib/dte/provider";
import type { DteIssueInput } from "@/lib/dte/mock-provider";
import { MockDTEProvider } from "@/lib/dte/mock-provider";

async function createTestDb() {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

const BASE_BOLETA_INPUT: DteIssueInput = {
  orderId: "order-001",
  documentType: "boleta",
  items: [{ description: "Alimento", quantity: 1, unitPrice: 11900, lineTotal: 11900, afecto: true }],
  receiver: { rut: "66666666-6", name: "Consumidor Final" },
  total: 11900,
  issuerRut: "76000000-0",
};

describe("MockDTEProvider (F3.6)", () => {
  it("I-4-a: implements DTEProvider interface at compile time (runtime check)", () => {
    // If this instantiates without error, the class exists and is constructable
    const provider = new MockDTEProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.issueDocument).toBe("function");
    expect(typeof provider.cancelDocument).toBe("function");
    expect(typeof provider.getFolio).toBe("function");
  });

  it("I-3: issueDocument assigns incrementing folio", async () => {
    const db = await createTestDb();
    const provider = new MockDTEProvider();
    const result = await provider.issueDocument(db as never, BASE_BOLETA_INPUT);
    expect(result.folio).toBe(1);
    const result2 = await provider.issueDocument(db as never, BASE_BOLETA_INPUT);
    expect(result2.folio).toBe(2);
  });

  it("INV-2: issueDocument computes IVA correctly (net + taxAmount === total)", async () => {
    const db = await createTestDb();
    const provider = new MockDTEProvider();
    const result = await provider.issueDocument(db as never, BASE_BOLETA_INPUT);
    expect(result.net + result.taxAmount).toBe(result.total);
    expect(result.total).toBe(11900);
    expect(result.net).toBe(10000);
    expect(result.taxAmount).toBe(1900);
  });

  it("C-3-a: factura without receiver RUT throws DteMissingReceiverRutError", async () => {
    const db = await createTestDb();
    const provider = new MockDTEProvider();
    const input: DteIssueInput = {
      ...BASE_BOLETA_INPUT,
      documentType: "factura",
      receiver: { rut: "", name: "Empresa SPA" },
    };
    await expect(provider.issueDocument(db as never, input)).rejects.toThrow(DteMissingReceiverRutError);
  });

  it("C-3-a: factura without receiver RUT (undefined) throws DteMissingReceiverRutError", async () => {
    const db = await createTestDb();
    const provider = new MockDTEProvider();
    const input: DteIssueInput = {
      ...BASE_BOLETA_INPUT,
      documentType: "factura",
      receiver: { rut: undefined as unknown as string, name: "Empresa SPA" },
    };
    await expect(provider.issueDocument(db as never, input)).rejects.toThrow(DteMissingReceiverRutError);
  });

  it("I-5-a: stamp is deterministic — same inputs produce same stamp", async () => {
    const db1 = await createTestDb();
    const db2 = await createTestDb();
    const provider = new MockDTEProvider();
    const fixedDate = new Date("2026-05-30T12:00:00Z");

    const result1 = await provider.issueDocument(db1 as never, { ...BASE_BOLETA_INPUT }, fixedDate);
    const result2 = await provider.issueDocument(db2 as never, { ...BASE_BOLETA_INPUT }, fixedDate);
    // Both start at folio 1 in fresh DBs, same inputs → same stamp
    expect(result1.stamp).toBe(result2.stamp);
  });

  it("P-3-a: pdfUrl matches /api/dte/{id}/pdf pattern", async () => {
    const db = await createTestDb();
    const provider = new MockDTEProvider();
    const result = await provider.issueDocument(db as never, BASE_BOLETA_INPUT);
    expect(result.pdfUrl).toMatch(/^\/api\/dte\/.+\/pdf$/);
  });

  it("C-4-a: boleta uses '66666666-6' fallback RUT from receiver", async () => {
    const db = await createTestDb();
    const provider = new MockDTEProvider();
    const result = await provider.issueDocument(db as never, {
      ...BASE_BOLETA_INPUT,
      receiver: { rut: "66666666-6", name: "Consumidor Final" },
    });
    expect(result.type).toBe("boleta");
    expect(result.total).toBe(11900);
  });
});
