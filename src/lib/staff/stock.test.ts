import { vi, describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

const getLoader = async () => import("./stock");

const makeDbChain = (rows: unknown[]) => ({
  from: vi.fn(() => ({
    leftJoin: vi.fn(() => ({
      leftJoin: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => rows),
          })),
        })),
      })),
    })),
  })),
});

describe("searchProductsWithStock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // S-LOADER-1
  it("S-LOADER-1: returns grouped ProductStockRow[] for matching products", async () => {
    const flatRows = [
      {
        productId: "prod-1",
        productName: "Pelota Grande",
        productSlug: "pelota-grande",
        brandName: "PetPlay",
        variantId: "var-1",
        variantName: "Azul",
        stockStatus: "in_stock",
      },
      {
        productId: "prod-1",
        productName: "Pelota Grande",
        productSlug: "pelota-grande",
        brandName: "PetPlay",
        variantId: "var-2",
        variantName: "Rojo",
        stockStatus: "low_stock",
      },
    ];

    (db as AnyDb).select = vi.fn(() => makeDbChain(flatRows));

    const { searchProductsWithStock } = await getLoader();
    const result = await searchProductsWithStock({ query: "pelota", storeId: "providencia" });

    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe("prod-1");
    expect(result[0].variants).toHaveLength(2);
    expect(result[0].variants[0].status).toBe("in_stock");
    expect(result[0].variants[1].status).toBe("low_stock");
  });

  // S-LOADER-2
  it("S-LOADER-2: limit is respected at query level", async () => {
    const flatRows = [
      { productId: "p1", productName: "Alpha", productSlug: "alpha", brandName: "B", variantId: "v1", variantName: "V1", stockStatus: "in_stock" },
      { productId: "p2", productName: "Beta", productSlug: "beta", brandName: "B", variantId: "v2", variantName: "V2", stockStatus: "in_stock" },
    ];
    const mockLimit = vi.fn(async () => flatRows);
    const mockWhere = vi.fn(() => ({ limit: mockLimit }));
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              where: mockWhere,
            })),
          })),
        })),
      })),
    }));

    const { searchProductsWithStock } = await getLoader();
    await searchProductsWithStock({ query: "a", storeId: "providencia", limit: 5 });

    expect(mockLimit).toHaveBeenCalledWith(5);
  });

  it("returns [] for empty query (no-op)", async () => {
    const { searchProductsWithStock } = await getLoader();
    const result = await searchProductsWithStock({ query: "", storeId: "providencia" });
    expect(result).toEqual([]);
    expect((db as AnyDb).select).not.toHaveBeenCalled();
  });
});
