import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StockPanel } from "./stock-panel";
import type { ProductStockRow } from "@/lib/staff/stock";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: vi.fn() })),
}));
vi.mock("./stock-search-input", () => ({
  StockSearchInput: ({ query }: { query: string }) => (
    <input data-testid="search-input" defaultValue={query} />
  ),
}));

const mockResults: ProductStockRow[] = [
  {
    productId: "prod-1",
    productName: "Pelota Grande",
    productSlug: "pelota-grande",
    brandName: "PetPlay",
    variants: [
      { variantId: "v1", variantName: "Azul", status: "in_stock" },
      { variantId: "v2", variantName: "Rojo", status: "low_stock" },
    ],
  },
];

describe("StockPanel", () => {
  it("renders product list with variant pills", () => {
    render(<StockPanel initialResults={mockResults} query="" storeId="providencia" />);
    expect(screen.getByText("Pelota Grande")).toBeInTheDocument();
    expect(screen.getByText("PetPlay")).toBeInTheDocument();
    expect(screen.getByText("Azul")).toBeInTheDocument();
    expect(screen.getByText("Rojo")).toBeInTheDocument();
  });

  it("shows empty state when no results and query present", () => {
    render(<StockPanel initialResults={[]} query="test" storeId="providencia" />);
    expect(screen.getByText(/sin resultados/i)).toBeInTheDocument();
  });

  it("shows prompt when no results and no query", () => {
    render(<StockPanel initialResults={[]} query="" storeId="providencia" />);
    expect(screen.getByText(/ingresá/i)).toBeInTheDocument();
  });
});
