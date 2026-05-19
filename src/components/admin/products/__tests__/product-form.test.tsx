import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import type { Brand, Category, Store } from "@/types";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  redirect: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockBrands: Brand[] = [
  { id: "royal-canin", slug: "royal-canin", name: "Royal Canin" },
  { id: "pro-plan", slug: "pro-plan", name: "Pro Plan" },
];

const mockCategories: Category[] = [
  { id: "alimentos-perros", slug: "alimentos-perros", name: "Alimentos Perros", parentId: null, species: "dog", order: 1 },
];

const mockStores: Store[] = [
  {
    id: "store-1",
    slug: "providencia",
    name: "Providencia",
    address: "Av. Providencia 1234",
    commune: "Providencia",
    phone: "+56 2 2345 6789",
    coordinates: { lat: -33.42, lng: -70.61 },
    schedule: { weekdays: "10:00-20:00", saturday: "10:00-19:00", sunday: "11:00-17:00" },
    services: ["shop"],
  },
];

const mockAction = vi.fn();

// Lazy import so mocks are in place
const getProductForm = async () => {
  const m = await import("@/components/admin/products/product-form");
  return m.default;
};

// ---------------------------------------------------------------------------
// Phase 9.1 — VARIANT ARRAY BEHAVIOR (highest-risk — must be written FIRST)
// ---------------------------------------------------------------------------

describe("ProductForm — variant array (Phase 9.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders one initial variant row in create mode", async () => {
    const ProductForm = await getProductForm();
    render(
      <ProductForm
        mode="create"
        brands={mockBrands}
        categories={mockCategories}
        stores={mockStores}
        action={mockAction}
      />,
    );

    // Should have one variant row (SKU input)
    const skuInputs = screen.getAllByPlaceholderText(/sku/i);
    expect(skuInputs).toHaveLength(1);
  });

  it("clicking 'Agregar variante' adds a second row", async () => {
    const ProductForm = await getProductForm();
    render(
      <ProductForm
        mode="create"
        brands={mockBrands}
        categories={mockCategories}
        stores={mockStores}
        action={mockAction}
      />,
    );

    const addButton = screen.getByRole("button", { name: /agregar variante/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      const skuInputs = screen.getAllByPlaceholderText(/sku/i);
      expect(skuInputs).toHaveLength(2);
    });
  });

  it("clicking trash on a variant row removes it; cannot remove the last one", async () => {
    const ProductForm = await getProductForm();
    render(
      <ProductForm
        mode="create"
        brands={mockBrands}
        categories={mockCategories}
        stores={mockStores}
        action={mockAction}
      />,
    );

    // Add a second variant
    const addButton = screen.getByRole("button", { name: /agregar variante/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText(/sku/i)).toHaveLength(2);
    });

    // Remove one variant (click trash on second row)
    const removeButtons = screen.getAllByRole("button", { name: /eliminar variante/i });
    expect(removeButtons).toHaveLength(2);
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText(/sku/i)).toHaveLength(1);
    });

    // With only 1 variant, the remove button should be disabled or absent
    const remainingRemoveButtons = screen.queryAllByRole("button", { name: /eliminar variante/i });
    if (remainingRemoveButtons.length > 0) {
      expect(remainingRemoveButtons[0]).toBeDisabled();
    }
  });
});

// ---------------------------------------------------------------------------
// Phase 9.2 — Remaining form tests
// ---------------------------------------------------------------------------

describe("ProductForm — slug auto-generation (Phase 9.2)", () => {
  it("slug auto-fills from name when override is OFF", async () => {
    const ProductForm = await getProductForm();
    render(
      <ProductForm
        mode="create"
        brands={mockBrands}
        categories={mockCategories}
        stores={mockStores}
        action={mockAction}
      />,
    );

    const nameInput = document.getElementById("name") as HTMLInputElement;
    expect(nameInput).not.toBeNull();
    fireEvent.change(nameInput, { target: { value: "Alimento Royal Canin" } });

    await waitFor(() => {
      const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement;
      expect(slugInput.value).toBe("alimento-royal-canin");
    });
  });

  it("toggling override stops auto-fill from name", async () => {
    const ProductForm = await getProductForm();
    render(
      <ProductForm
        mode="create"
        brands={mockBrands}
        categories={mockCategories}
        stores={mockStores}
        action={mockAction}
      />,
    );

    // Enable manual override
    const overrideToggle = screen.getByRole("button", { name: /editar manualmente/i });
    fireEvent.click(overrideToggle);

    // Change name
    const nameInput = document.getElementById("name") as HTMLInputElement;
    expect(nameInput).not.toBeNull();
    fireEvent.change(nameInput, { target: { value: "Nuevo Nombre" } });

    await waitFor(() => {
      const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement;
      // Slug should NOT have changed to "nuevo-nombre"
      expect(slugInput.value).not.toBe("nuevo-nombre");
    });
  });
});

describe("ProductForm — compareAt reveal (Phase 9.2)", () => {
  it("compareAt input is hidden until 'Agregar descuento' is clicked", async () => {
    const ProductForm = await getProductForm();
    render(
      <ProductForm
        mode="create"
        brands={mockBrands}
        categories={mockCategories}
        stores={mockStores}
        action={mockAction}
      />,
    );

    // Compare-at input should not be visible initially
    expect(screen.queryByLabelText(/precio de lista/i)).not.toBeInTheDocument();

    // Click "Agregar descuento"
    const discountButton = screen.getByRole("button", { name: /agregar descuento/i });
    fireEvent.click(discountButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/precio de lista/i)).toBeInTheDocument();
    });
  });
});

describe("ProductForm — submit behavior (Phase 9.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls action prop with correct payload on valid submit", async () => {
    mockAction.mockResolvedValue({ ok: true, id: "new-product-id" });

    const ProductForm = await getProductForm();
    render(
      <ProductForm
        mode="create"
        brands={mockBrands}
        categories={mockCategories}
        stores={mockStores}
        action={mockAction}
      />,
    );

    // Fill name (slug auto-fills)
    const nameInput = document.getElementById("name") as HTMLInputElement;
    expect(nameInput).not.toBeNull();
    fireEvent.change(nameInput, { target: { value: "Producto Test" } });

    // Fill description
    const descInput = document.getElementById("description") as HTMLTextAreaElement;
    if (descInput) fireEvent.change(descInput, { target: { value: "Descripción del producto test" } });

    // Select brand
    const brandSelect = document.getElementById("brandId") as HTMLSelectElement;
    if (brandSelect) fireEvent.change(brandSelect, { target: { value: "royal-canin" } });

    // Select at least one species (click first checkbox)
    const speciesCheckboxes = screen.getAllByRole("checkbox");
    if (speciesCheckboxes.length > 0) fireEvent.click(speciesCheckboxes[0]);

    // Fill image URL and alt (first image row)
    const urlInput = document.getElementById("images[0].url") as HTMLInputElement;
    if (urlInput) fireEvent.change(urlInput, { target: { value: "https://example.com/img.jpg" } });
    const altInput = document.getElementById("images[0].alt") as HTMLInputElement;
    if (altInput) fireEvent.change(altInput, { target: { value: "Test image" } });

    // Fill variant fields
    const skuInput = document.getElementById("variants[0].sku") as HTMLInputElement;
    if (skuInput) fireEvent.change(skuInput, { target: { value: "TEST-001" } });
    const variantNameInput = document.getElementById("variants[0].name") as HTMLInputElement;
    if (variantNameInput) fireEvent.change(variantNameInput, { target: { value: "1 kg" } });
    const qtyInput = document.getElementById("variants[0].quantityValue") as HTMLInputElement;
    if (qtyInput) fireEvent.change(qtyInput, { target: { value: "1" } });
    const priceInput = document.getElementById("variants[0].priceAmount") as HTMLInputElement;
    if (priceInput) fireEvent.change(priceInput, { target: { value: "9990" } });

    // Submit
    const submitButton = screen.getByRole("button", { name: /guardar/i });
    fireEvent.click(submitButton);

    // Action MUST be called — no conditional
    await waitFor(() => {
      expect(mockAction).toHaveBeenCalledTimes(1);
      expect(mockAction.mock.calls[0][0]).toMatchObject({ name: "Producto Test" });
    });
  });

  it("surfaces server-side field errors returned by the action", async () => {
    mockAction.mockResolvedValue({
      ok: false,
      errors: {
        fieldErrors: { name: ["nombre inválido del server"] },
        formErrors: [],
      },
    });

    const ProductForm = await getProductForm();
    render(
      <ProductForm
        mode="create"
        brands={mockBrands}
        categories={mockCategories}
        stores={mockStores}
        action={mockAction}
      />,
    );

    // Fill required fields so submit can fire (same fill pattern as "calls action prop" test)
    const nameInput = document.getElementById("name") as HTMLInputElement;
    expect(nameInput).not.toBeNull();
    fireEvent.change(nameInput, { target: { value: "Producto Con Error" } });

    const descInput = document.getElementById("description") as HTMLTextAreaElement;
    if (descInput) fireEvent.change(descInput, { target: { value: "Descripción válida" } });

    const brandSelect = document.getElementById("brandId") as HTMLSelectElement;
    if (brandSelect) fireEvent.change(brandSelect, { target: { value: "royal-canin" } });

    const urlInput = document.getElementById("images[0].url") as HTMLInputElement;
    if (urlInput) fireEvent.change(urlInput, { target: { value: "https://example.com/img.jpg" } });
    const altInput = document.getElementById("images[0].alt") as HTMLInputElement;
    if (altInput) fireEvent.change(altInput, { target: { value: "Test image" } });

    const skuInput = document.getElementById("variants[0].sku") as HTMLInputElement;
    if (skuInput) fireEvent.change(skuInput, { target: { value: "TEST-001" } });
    const variantNameInput = document.getElementById("variants[0].name") as HTMLInputElement;
    if (variantNameInput) fireEvent.change(variantNameInput, { target: { value: "1 kg" } });
    const priceInput = document.getElementById("variants[0].priceAmount") as HTMLInputElement;
    if (priceInput) fireEvent.change(priceInput, { target: { value: "9990" } });

    // Submit — this calls the action which returns { ok: false, errors }
    await act(async () => {
      const submitButton = screen.getByRole("button", { name: /guardar/i });
      fireEvent.click(submitButton);
    });

    // The action must have been called
    await waitFor(() => {
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    // The server error text must appear in the DOM (surfaced via form.setFieldMeta)
    await waitFor(() => {
      expect(screen.getByText("nombre inválido del server")).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

// ---------------------------------------------------------------------------
// W-1 — On-change validation (validators.onChange wired via productFormSchema)
// ---------------------------------------------------------------------------

describe("ProductForm — onChange validation (W-1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows per-field error when priceAmount is set to 0 (invalid) before submit", async () => {
    mockAction.mockResolvedValue({ ok: true, id: "p1" });

    const ProductForm = await getProductForm();
    render(
      <ProductForm
        mode="create"
        brands={mockBrands}
        categories={mockCategories}
        stores={mockStores}
        action={mockAction}
      />,
    );

    // Type an invalid price (0) into the first variant's priceAmount input
    const priceInput = document.getElementById("variants[0].priceAmount") as HTMLInputElement;
    expect(priceInput).not.toBeNull();

    await act(async () => {
      fireEvent.change(priceInput, { target: { value: "0" } });
      fireEvent.blur(priceInput);
    });

    // The field-level error should appear — onChange validator fires immediately
    await waitFor(() => {
      // priceAmount path: "variants.0.priceAmount" mapped from Zod issue path [variants, 0, priceAmount]
      const errorTexts = screen.queryAllByRole("alert");
      const hasError = errorTexts.some((el) =>
        el.textContent?.includes("Precio debe ser mayor a 0") ||
        el.textContent?.includes("Sin decimales")
      );
      expect(hasError).toBe(true);
    }, { timeout: 3000 });
  });

  it("does not show errors on pristine fields before interaction", async () => {
    mockAction.mockResolvedValue({ ok: true, id: "p1" });

    const ProductForm = await getProductForm();
    render(
      <ProductForm
        mode="create"
        brands={mockBrands}
        categories={mockCategories}
        stores={mockStores}
        action={mockAction}
      />,
    );

    // On initial render, no error alerts should appear
    const errorAlerts = screen.queryAllByRole("alert");
    expect(errorAlerts.length).toBe(0);
  });
});

describe("ProductForm — edit mode pre-population (Phase 9.2)", () => {
  it("form is pre-populated with initial data in edit mode", async () => {
    const initial = {
      id: "p1",
      name: "Omega 3 Cat",
      slug: "omega-3-cat",
      brandId: "royal-canin",
      description: "Alimento para gatos",
      shortDescription: null,
      species: ["cat"],
      tags: [],
      targetSize: null,
      lifeStage: null,
      ingredients: null,
      featured: false,
      categoryIds: ["alimentos-perros"],
      images: [{ id: "img-1", url: "https://example.com/img.jpg", alt: "Omega 3 Cat", sortOrder: 0 }],
      variants: [
        {
          id: "v1",
          sku: "OMG-001",
          name: "1 kg",
          quantityValue: 1,
          quantityUnit: "kg",
          priceAmount: 15000,
          compareAtAmount: null,
          barcode: null,
          stockByStore: { "store-1": "in_stock" },
        },
        {
          id: "v2",
          sku: "OMG-002",
          name: "3 kg",
          quantityValue: 3,
          quantityUnit: "kg",
          priceAmount: 35000,
          compareAtAmount: null,
          barcode: null,
          stockByStore: { "store-1": "in_stock" },
        },
      ],
    };

    const ProductForm = await getProductForm();
    render(
      <ProductForm
        mode="edit"
        brands={mockBrands}
        categories={mockCategories}
        stores={mockStores}
        initial={initial as never}
        action={mockAction}
      />,
    );

    const nameInput = document.getElementById("name") as HTMLInputElement;
    expect(nameInput).not.toBeNull();
    expect(nameInput.value).toBe("Omega 3 Cat");

    // Both variant rows should be shown
    const skuInputs = screen.getAllByPlaceholderText(/sku/i);
    expect(skuInputs).toHaveLength(2);
  });
});
