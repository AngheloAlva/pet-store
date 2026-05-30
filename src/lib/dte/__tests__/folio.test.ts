/**
 * T-06 [RED] → T-07 [GREEN] — getFolioWithDb unit tests
 * Spec: F-1, F-2, S-2
 * Uses PGlite for real DB integration via the *WithDb injection pattern.
 */
import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import * as schema from "@/db/schema";
import { getFolioWithDb } from "@/lib/dte/folio";

async function createTestDb() {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

describe("getFolioWithDb", () => {
  it("F-1-a: first call returns 1 (upsert from zero)", async () => {
    const db = await createTestDb();
    const folio = await getFolioWithDb(db as never, "boleta");
    expect(folio).toBe(1);
  });

  it("F-1: sequential increments return 1, 2, 3", async () => {
    const db = await createTestDb();
    const a = await getFolioWithDb(db as never, "factura");
    const b = await getFolioWithDb(db as never, "factura");
    const c = await getFolioWithDb(db as never, "factura");
    expect(a).toBe(1);
    expect(b).toBe(2);
    expect(c).toBe(3);
  });

  it("F-1-b: different types have independent counters", async () => {
    const db = await createTestDb();
    await getFolioWithDb(db as never, "boleta");
    await getFolioWithDb(db as never, "boleta");
    const facturaFolio = await getFolioWithDb(db as never, "factura");
    // boleta is at 2, factura should still start at 1
    expect(facturaFolio).toBe(1);
  });

  it("F-2-a: nota_credito counter is independent from boleta", async () => {
    const db = await createTestDb();
    // Advance boleta to 10 by calling many times
    for (let i = 0; i < 10; i++) {
      await getFolioWithDb(db as never, "boleta");
    }
    const ncFolio = await getFolioWithDb(db as never, "nota_credito");
    expect(ncFolio).toBe(1); // nota_credito unaffected by boleta calls
  });

  it("S-2-a: upsert creates counter row on first call for unknown type", async () => {
    const db = await createTestDb();
    // nota_debito never existed in DB before this call
    const folio = await getFolioWithDb(db as never, "nota_debito");
    expect(folio).toBe(1);
  });
});
