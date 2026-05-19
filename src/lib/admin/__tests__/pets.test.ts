import { vi, describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

beforeEach(() => {
  vi.clearAllMocks();
});

const mockPet = {
  id: "pet-tobi",
  userId: "user-camila-demo",
  name: "Tobi",
  species: "dog",
  breed: "Golden Retriever",
  birthDate: "2021-03-12",
  active: true,
};

describe("getUserPets", () => {
  it("returns only active pets for the given userId", async () => {
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [mockPet]),
      })),
    }));

    const { getUserPets } = await import("@/lib/admin/pets");
    const result = await getUserPets("user-camila-demo");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Tobi");
  });

  it("returns empty array when user has no active pets", async () => {
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    }));

    const { getUserPets } = await import("@/lib/admin/pets");
    const result = await getUserPets("user-no-pets");
    expect(result).toHaveLength(0);
  });
});

describe("getAllPets", () => {
  it("returns all pets without filters", async () => {
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [mockPet, { ...mockPet, id: "pet-luna", active: false }]),
      })),
    }));

    const { getAllPets } = await import("@/lib/admin/pets");
    const result = await getAllPets({});
    expect(result).toHaveLength(2);
  });

  it("applies species filter", async () => {
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [mockPet]),
      })),
    }));

    const { getAllPets } = await import("@/lib/admin/pets");
    const result = await getAllPets({ species: "dog" });
    expect(result).toHaveLength(1);
    expect(result[0].species).toBe("dog");
  });
});

describe("getPetsWithBirthdayInMonth", () => {
  it("returns active pets born in the given month via DB query", async () => {
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [mockPet]),
      })),
    }));

    const { getPetsWithBirthdayInMonth } = await import("@/lib/admin/pets");
    const result = await getPetsWithBirthdayInMonth(3);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Tobi");
  });

  it("returns empty array when no pets have birthday in given month", async () => {
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    }));

    const { getPetsWithBirthdayInMonth } = await import("@/lib/admin/pets");
    const result = await getPetsWithBirthdayInMonth(12);
    expect(result).toHaveLength(0);
  });
});
