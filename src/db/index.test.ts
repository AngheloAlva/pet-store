import { describe, it, expect, vi } from "vitest";

vi.unmock("@/db");
vi.unmock("@/db/loaders");

describe("db boot sequence", () => {
  it("instantiates PGlite, migrates, seeds, and serves queries", async () => {
    const { db, dbReady } = await import("@/db");
    await dbReady;
    const products = await db.query.products.findMany();
    expect(products.length).toBeGreaterThan(0);
  }, 20000);

  it("reuses the cached instance on re-import (singleton)", async () => {
    const a = await import("@/db");
    const b = await import("@/db");
    expect(a.db).toBe(b.db);
  });
});
