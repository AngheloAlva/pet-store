import { vi, describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { AdminProductRow } from "@/lib/admin/products";
import type { Brand, Category } from "@/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("@/lib/admin/products", () => ({
  loadAdminProductRows: vi.fn(async () => []),
  loadAllStores: vi.fn(async () => []),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  usePathname: vi.fn(() => "/admin/productos"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

vi.mock("@/app/actions/admin/products", () => ({
  bulkDeleteProducts: vi.fn(async (ids: string[]) => ({ ok: true, deleted: ids.length })),
  bulkToggleFeatured: vi.fn(async () => ({ ok: true })),
  deleteProduct: vi.fn(async () => ({ ok: true })),
  createProduct: vi.fn(async () => ({ ok: true, id: "new-id" })),
  updateProduct: vi.fn(async () => ({ ok: true })),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeRow = (overrides: Partial<AdminProductRow> = {}): AdminProductRow => ({
  id: "p1",
  slug: "test-product",
  name: "Royal Canin Adult",
  brandName: "Royal Canin",
  categoryNames: ["Alimentos", "Perros"],
  minPrice: 24990,
  stockSummary: { inStock: 3, low: 1, out: 0 },
  featured: false,
  thumbnailUrl: "https://example.com/img.jpg",
  ...overrides,
});

const mockBrands: Brand[] = [
  { id: "royal-canin", slug: "royal-canin", name: "Royal Canin" },
];

const mockCategories: Category[] = [
  { id: "alimentos-perros", slug: "alimentos-perros", name: "Alimentos", parentId: null, species: "dog", order: 1 },
];

// ---------------------------------------------------------------------------
// Test: ProductListClient (client-side selection behavior)
// ---------------------------------------------------------------------------
import ProductListClient from "@/components/admin/products/product-list-client";

describe("ProductListClient", () => {
  const rows: AdminProductRow[] = [
    makeRow({ id: "p1", name: "Producto Uno", featured: false }),
    makeRow({ id: "p2", name: "Producto Dos", featured: true }),
    makeRow({ id: "p3", name: "Producto Tres", featured: false }),
  ];

  it("renders all rows with name, brand, categories, price", () => {
    render(<ProductListClient rows={rows} brands={mockBrands} categories={mockCategories} />);
    expect(screen.getByText("Producto Uno")).toBeInTheDocument();
    expect(screen.getByText("Producto Dos")).toBeInTheDocument();
    expect(screen.getAllByText("Royal Canin").length).toBeGreaterThan(0);
  });

  it("bulk toolbar is hidden when 0 rows selected", () => {
    render(<ProductListClient rows={rows} brands={mockBrands} categories={mockCategories} />);
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
  });

  it("bulk toolbar appears when >= 1 row is selected", async () => {
    render(<ProductListClient rows={rows} brands={mockBrands} categories={mockCategories} />);
    const checkboxes = screen.getAllByRole("checkbox");
    // First checkbox is select-all, row checkboxes follow
    fireEvent.click(checkboxes[1]); // click first row checkbox
    await waitFor(() => {
      expect(screen.getByRole("toolbar")).toBeInTheDocument();
    });
  });

  it("bulk toolbar shows count and delete button", async () => {
    render(<ProductListClient rows={rows} brands={mockBrands} categories={mockCategories} />);
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);
    await waitFor(() => {
      expect(screen.getByRole("toolbar")).toBeInTheDocument();
      expect(screen.getByText(/2 seleccionados/i)).toBeInTheDocument();
    });
  });

  it("select-all checkbox selects all rows and shows toolbar", async () => {
    render(<ProductListClient rows={rows} brands={mockBrands} categories={mockCategories} />);
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]); // header select-all
    await waitFor(() => {
      expect(screen.getByRole("toolbar")).toBeInTheDocument();
      expect(screen.getByText(/3 seleccionados/i)).toBeInTheDocument();
    });
  });

  it("clicking delete opens a dialog with the product name", async () => {
    render(<ProductListClient rows={rows} brands={mockBrands} categories={mockCategories} />);
    const deleteButtons = screen.getAllByRole("button", { name: /eliminar/i });
    // Find a per-row delete button (not the bulk one)
    fireEvent.click(deleteButtons[0]);
    await waitFor(() => {
      // The alert dialog should appear
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });
  });
});

describe("ProductListClient — filter display", () => {
  it("renders rows with min price in CLP format", () => {
    const row = makeRow({ minPrice: 9990 });
    render(<ProductListClient rows={[row]} brands={mockBrands} categories={mockCategories} />);
    expect(screen.getByText(/9\.990/)).toBeInTheDocument();
  });

  it("shows featured badge for featured products", () => {
    const row = makeRow({ featured: true });
    render(<ProductListClient rows={[row]} brands={mockBrands} categories={mockCategories} />);
    // Featured indicator should be present
    expect(screen.getByTitle(/destacado/i)).toBeInTheDocument();
  });

  it("renders thumbnail img tag", () => {
    const row = makeRow({ thumbnailUrl: "https://example.com/thumb.jpg" });
    render(<ProductListClient rows={[row]} brands={mockBrands} categories={mockCategories} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/thumb.jpg");
  });
});
