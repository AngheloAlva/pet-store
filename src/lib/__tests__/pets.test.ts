import { vi, describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getOwnPets", () => {
  it("returns only active pets for the userId", async () => {
    const mockPets = [
      { id: "pet-1", userId: "user-camila-demo", name: "Tobi", active: true },
    ];

    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => mockPets),
      })),
    }));

    const { getOwnPets } = await import("@/lib/pets");
    const result = await getOwnPets("user-camila-demo");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Tobi");
  });

  it("returns empty array when user has no pets", async () => {
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    }));

    const { getOwnPets } = await import("@/lib/pets");
    const result = await getOwnPets("user-nobody");
    expect(result).toHaveLength(0);
  });
});
