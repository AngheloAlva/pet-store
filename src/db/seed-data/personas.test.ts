import { describe, it, expect } from "vitest";
import { personas } from "./personas";

describe("Seed personas", () => {
  // S-SEED-1
  it("S-SEED-1: staff@demo.cl exists with role=staff, storeId=providencia, correct name", () => {
    const staffUser = personas.find((u) => u.email === "staff@demo.cl");

    expect(staffUser).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((staffUser as any)?.role).toBe("staff");
    expect(staffUser?.storeId).toBe("providencia");
    expect(staffUser?.name).toBe("Vendedor Sucursal Centro");
  });
});
