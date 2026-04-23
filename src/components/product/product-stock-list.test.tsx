import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { stores, getStockLevel } from "@/test/fixtures";
import type { Store, StockLevel } from "@/types";

// Build stock levels for rc-ma-3 and rc-ma-15 from fixture helpers.
function makeStockLevels(variantId: string): (StockLevel & { store: Store })[] {
  return stores.map((store) => ({
    ...getStockLevel(variantId, store.id),
    store,
  }));
}

const fixtureStockLevels = [
  ...makeStockLevels("rc-ma-3"),
  ...makeStockLevels("rc-ma-15"),
];

vi.mock("@/db/loaders", () => ({
  loadAllStockLevels: vi.fn(async () => fixtureStockLevels),
  loadAllProducts: vi.fn(async () => []),
  loadAllBrands: vi.fn(async () => []),
  loadAllCategories: vi.fn(async () => []),
  loadAllStores: vi.fn(async () => stores),
  getCachedStockLevels: vi.fn(() => fixtureStockLevels),
  getCachedProducts: vi.fn(() => []),
  getCachedBrands: vi.fn(() => []),
  getCachedCategories: vi.fn(() => []),
  getCachedStores: vi.fn(() => stores),
  initSyncCache: vi.fn(async () => {}),
}));

import { ProductStockList } from "./product-stock-list";

describe("ProductStockList", () => {
  it("renders one row per store with the store name", () => {
    render(<ProductStockList variantId="rc-ma-3" />);
    for (const s of stores) {
      expect(screen.getByText(s.name)).toBeInTheDocument();
    }
  });

  it("labels stock statuses in Spanish", () => {
    // rc-ma-15: maipu out_of_stock, nunoa low_stock
    render(<ProductStockList variantId="rc-ma-15" />);
    expect(screen.getByText(/sin stock/i)).toBeInTheDocument();
    expect(screen.getByText(/últimas unidades/i)).toBeInTheDocument();
    expect(screen.getAllByText(/disponible/i).length).toBeGreaterThan(0);
  });
});
