/**
 * Tasks 1.2, 1.3, 1.4 RED — Address CRUD actions (PGlite).
 * Tests: listAddressesWithDb, createAddressWithDb, updateAddressWithDb,
 *        setDefaultAddressWithDb (tx), deleteAddressWithDb (tx + auto-promote).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

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
      id: "user-a",
      email: "usera@test.cl",
      name: "User A",
      role: "customer",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "user-b",
      email: "userb@test.cl",
      name: "User B",
      role: "customer",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    },
  ]);
}

const baseAddress = {
  label: "Casa",
  name: "User A",
  street: "Av. Principal 123",
  commune: "Santiago",
  region: "Región Metropolitana",
  phone: "+56912345678",
};

describe("address CRUD actions — integration (PGlite)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // listAddressesWithDb
  // ---------------------------------------------------------------------------
  it("listAddressesWithDb returns only addresses for given userId (ADDR-6)", async () => {
    const db = await createTestDb();
    await seedUsers(db);

    const { listAddressesWithDb, createAddressWithDb } = await import(
      "@/app/actions/cuenta/direcciones"
    );

    // Create address for user-a
    await createAddressWithDb(db as never, "user-a", baseAddress);
    // Create address for user-b
    await createAddressWithDb(db as never, "user-b", { ...baseAddress, label: "Oficina" });

    const result = await listAddressesWithDb(db as never, "user-a");
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe("user-a");
  });

  // ---------------------------------------------------------------------------
  // createAddressWithDb — first address auto-sets isDefault (ADDR-2)
  // ---------------------------------------------------------------------------
  it("createAddressWithDb: first address auto-sets isDefault=true (ADDR-2)", async () => {
    const db = await createTestDb();
    await seedUsers(db);

    const { createAddressWithDb } = await import("@/app/actions/cuenta/direcciones");

    const result = await createAddressWithDb(db as never, "user-a", baseAddress);
    expect(result.ok).toBe(true);

    const addresses = await db
      .select()
      .from(schema.userAddresses)
      .where((await import("drizzle-orm")).eq(schema.userAddresses.userId, "user-a"));

    expect(addresses).toHaveLength(1);
    expect(addresses[0].isDefault).toBe(true);
  });

  it("createAddressWithDb: second address does NOT auto-set isDefault (ADDR-2)", async () => {
    const db = await createTestDb();
    await seedUsers(db);

    const { createAddressWithDb } = await import("@/app/actions/cuenta/direcciones");

    await createAddressWithDb(db as never, "user-a", baseAddress);
    await createAddressWithDb(db as never, "user-a", { ...baseAddress, label: "Oficina" });

    const addresses = await db
      .select()
      .from(schema.userAddresses)
      .where((await import("drizzle-orm")).eq(schema.userAddresses.userId, "user-a"));

    const defaults = addresses.filter((a) => a.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].label).toBe("Casa"); // first one
  });

  it("createAddressWithDb: returns COMMUNE_NOT_COVERED for uncovered commune (ADDR-2)", async () => {
    const db = await createTestDb();
    await seedUsers(db);

    const { createAddressWithDb } = await import("@/app/actions/cuenta/direcciones");

    const result = await createAddressWithDb(db as never, "user-a", {
      ...baseAddress,
      commune: "Arica", // not in covered list
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("COMMUNE_NOT_COVERED");
    }
  });

  // ---------------------------------------------------------------------------
  // updateAddressWithDb
  // ---------------------------------------------------------------------------
  it("updateAddressWithDb updates the address fields", async () => {
    const db = await createTestDb();
    await seedUsers(db);

    const { createAddressWithDb, updateAddressWithDb } = await import(
      "@/app/actions/cuenta/direcciones"
    );

    const createResult = await createAddressWithDb(db as never, "user-a", baseAddress);
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const updateResult = await updateAddressWithDb(db as never, "user-a", createResult.addressId, {
      ...baseAddress,
      label: "Trabajo",
    });

    expect(updateResult.ok).toBe(true);

    const rows = await db
      .select()
      .from(schema.userAddresses)
      .where((await import("drizzle-orm")).eq(schema.userAddresses.id, createResult.addressId));

    expect(rows[0].label).toBe("Trabajo");
  });

  it("updateAddressWithDb returns NOT_FOUND for address of other user (ADDR-6)", async () => {
    const db = await createTestDb();
    await seedUsers(db);

    const { createAddressWithDb, updateAddressWithDb } = await import(
      "@/app/actions/cuenta/direcciones"
    );

    const createResult = await createAddressWithDb(db as never, "user-a", baseAddress);
    if (!createResult.ok) throw new Error("setup failed");

    // user-b tries to update user-a's address
    const result = await updateAddressWithDb(db as never, "user-b", createResult.addressId, {
      ...baseAddress,
      label: "Intento",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NOT_FOUND");
    }
  });

  // ---------------------------------------------------------------------------
  // setDefaultAddressWithDb — tx: unset prior + set new (ADDR-3)
  // ---------------------------------------------------------------------------
  it("setDefaultAddressWithDb: sets new default and unsets prior atomically (ADDR-3)", async () => {
    const db = await createTestDb();
    await seedUsers(db);

    const { createAddressWithDb, setDefaultAddressWithDb } = await import(
      "@/app/actions/cuenta/direcciones"
    );

    const r1 = await createAddressWithDb(db as never, "user-a", baseAddress);
    const r2 = await createAddressWithDb(db as never, "user-a", { ...baseAddress, label: "Oficina" });
    if (!r1.ok || !r2.ok) throw new Error("setup failed");

    // r1 should be default (first address)
    const before = await db
      .select()
      .from(schema.userAddresses)
      .where((await import("drizzle-orm")).eq(schema.userAddresses.userId, "user-a"));
    const defaultBefore = before.find((a) => a.isDefault);
    expect(defaultBefore?.id).toBe(r1.addressId);

    // Set r2 as default
    const setResult = await setDefaultAddressWithDb(db as never, "user-a", r2.addressId);
    expect(setResult.ok).toBe(true);

    const after = await db
      .select()
      .from(schema.userAddresses)
      .where((await import("drizzle-orm")).eq(schema.userAddresses.userId, "user-a"));

    const defaultAfter = after.find((a) => a.isDefault);
    expect(defaultAfter?.id).toBe(r2.addressId);

    // r1 must no longer be default
    const r1After = after.find((a) => a.id === r1.addressId);
    expect(r1After?.isDefault).toBe(false);

    // No more than one default
    const allDefaults = after.filter((a) => a.isDefault);
    expect(allDefaults).toHaveLength(1);
  });

  it("setDefaultAddressWithDb returns NOT_FOUND for address of other user (ADDR-6)", async () => {
    const db = await createTestDb();
    await seedUsers(db);

    const { createAddressWithDb, setDefaultAddressWithDb } = await import(
      "@/app/actions/cuenta/direcciones"
    );

    const r1 = await createAddressWithDb(db as never, "user-a", baseAddress);
    if (!r1.ok) throw new Error("setup failed");

    // user-b tries to set user-a's address as default
    const result = await setDefaultAddressWithDb(db as never, "user-b", r1.addressId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NOT_FOUND");
    }
  });

  // ---------------------------------------------------------------------------
  // deleteAddressWithDb — tx: delete + auto-promote (ADDR-4)
  // ---------------------------------------------------------------------------
  it("deleteAddressWithDb: deletes sole address, leaves no default (ADDR-4)", async () => {
    const db = await createTestDb();
    await seedUsers(db);

    const { createAddressWithDb, deleteAddressWithDb } = await import(
      "@/app/actions/cuenta/direcciones"
    );

    const r1 = await createAddressWithDb(db as never, "user-a", baseAddress);
    if (!r1.ok) throw new Error("setup failed");

    const deleteResult = await deleteAddressWithDb(db as never, "user-a", r1.addressId);
    expect(deleteResult.ok).toBe(true);

    const remaining = await db
      .select()
      .from(schema.userAddresses)
      .where((await import("drizzle-orm")).eq(schema.userAddresses.userId, "user-a"));

    expect(remaining).toHaveLength(0);
  });

  it("deleteAddressWithDb: delete default auto-promotes oldest remaining (ADDR-4)", async () => {
    const db = await createTestDb();
    await seedUsers(db);

    const { createAddressWithDb, deleteAddressWithDb } = await import(
      "@/app/actions/cuenta/direcciones"
    );

    // Create two addresses; r1 is first (oldest) and default
    const r1 = await createAddressWithDb(db as never, "user-a", baseAddress);
    const r2 = await createAddressWithDb(db as never, "user-a", { ...baseAddress, label: "Oficina" });
    if (!r1.ok || !r2.ok) throw new Error("setup failed");

    // Delete the default (r1)
    const deleteResult = await deleteAddressWithDb(db as never, "user-a", r1.addressId);
    expect(deleteResult.ok).toBe(true);

    const remaining = await db
      .select()
      .from(schema.userAddresses)
      .where((await import("drizzle-orm")).eq(schema.userAddresses.userId, "user-a"));

    expect(remaining).toHaveLength(1);
    // r2 should now be the default
    expect(remaining[0].id).toBe(r2.addressId);
    expect(remaining[0].isDefault).toBe(true);
  });

  it("deleteAddressWithDb: delete non-default does not affect other defaults (ADDR-4)", async () => {
    const db = await createTestDb();
    await seedUsers(db);

    const { createAddressWithDb, setDefaultAddressWithDb, deleteAddressWithDb } = await import(
      "@/app/actions/cuenta/direcciones"
    );

    const r1 = await createAddressWithDb(db as never, "user-a", baseAddress);
    const r2 = await createAddressWithDb(db as never, "user-a", { ...baseAddress, label: "Oficina" });
    if (!r1.ok || !r2.ok) throw new Error("setup failed");

    // Set r2 as default
    await setDefaultAddressWithDb(db as never, "user-a", r2.addressId);

    // Delete r1 (non-default)
    const deleteResult = await deleteAddressWithDb(db as never, "user-a", r1.addressId);
    expect(deleteResult.ok).toBe(true);

    const remaining = await db
      .select()
      .from(schema.userAddresses)
      .where((await import("drizzle-orm")).eq(schema.userAddresses.userId, "user-a"));

    expect(remaining).toHaveLength(1);
    expect(remaining[0].isDefault).toBe(true); // r2 still default
    expect(remaining[0].id).toBe(r2.addressId);
  });

  it("deleteAddressWithDb returns NOT_FOUND for address of other user (ADDR-6)", async () => {
    const db = await createTestDb();
    await seedUsers(db);

    const { createAddressWithDb, deleteAddressWithDb } = await import(
      "@/app/actions/cuenta/direcciones"
    );

    const r1 = await createAddressWithDb(db as never, "user-a", baseAddress);
    if (!r1.ok) throw new Error("setup failed");

    // user-b tries to delete user-a's address
    const result = await deleteAddressWithDb(db as never, "user-b", r1.addressId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NOT_FOUND");
    }
  });
});
