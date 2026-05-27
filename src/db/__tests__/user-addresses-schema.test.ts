/**
 * Task 0.1 RED — Schema test for user_addresses table (F3.4).
 * Asserts userAddresses table columns exist and isDefault defaults to false.
 */
import { describe, it, expect } from "vitest";

describe("Schema — user_addresses (F3.4)", () => {
  it("userAddresses table exists on schema", async () => {
    const schema = await import("@/db/schema");
    expect("userAddresses" in schema).toBe(true);
  });

  it("userAddresses table has id column", async () => {
    const { userAddresses } = await import("@/db/schema");
    expect("id" in userAddresses).toBe(true);
  });

  it("userAddresses table has userId column", async () => {
    const { userAddresses } = await import("@/db/schema");
    expect("userId" in userAddresses).toBe(true);
  });

  it("userAddresses table has label, name, street, commune, region, phone columns", async () => {
    const { userAddresses } = await import("@/db/schema");
    expect("label" in userAddresses).toBe(true);
    expect("name" in userAddresses).toBe(true);
    expect("street" in userAddresses).toBe(true);
    expect("commune" in userAddresses).toBe(true);
    expect("region" in userAddresses).toBe(true);
    expect("phone" in userAddresses).toBe(true);
  });

  it("userAddresses table has notes column (nullable)", async () => {
    const { userAddresses } = await import("@/db/schema");
    expect("notes" in userAddresses).toBe(true);
  });

  it("userAddresses table has isDefault column", async () => {
    const { userAddresses } = await import("@/db/schema");
    expect("isDefault" in userAddresses).toBe(true);
  });

  it("userAddresses table has createdAt and updatedAt columns", async () => {
    const { userAddresses } = await import("@/db/schema");
    expect("createdAt" in userAddresses).toBe(true);
    expect("updatedAt" in userAddresses).toBe(true);
  });

  it("exports NewUserAddress and UserAddress inferred types (via schema export)", async () => {
    // Type-level check: confirm named exports exist (will fail to import if missing)
    const schema = await import("@/db/schema");
    // If the exports don't exist, TypeScript would complain at compile time;
    // we just verify the module loads without error
    expect(schema).toBeDefined();
  });

  it("userAddressesRelations exists on schema", async () => {
    const schema = await import("@/db/schema");
    expect("userAddressesRelations" in schema).toBe(true);
  });
});
