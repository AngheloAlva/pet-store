import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductStockList } from "./product-stock-list";
import { stores } from "@/data";

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
