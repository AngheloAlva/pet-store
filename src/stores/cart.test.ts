import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCartStore } from "./cart";

vi.mock("@/lib/stock", async () => {
  const actual = await vi.importActual<typeof import("@/lib/stock")>("@/lib/stock");
  return {
    ...actual,
    getVariantTotalStock: vi.fn((variantId: string) => {
      if (variantId === "oos") return 0;
      if (variantId === "low") return 3;
      return 99;
    }),
  };
});

const baseItem = {
  productId: "p1",
  variantId: "v1",
  name: "Prod",
  variantName: "Var",
  image: "",
  unitPrice: 1000,
  slug: "prod",
};

describe("cart store — drawer state", () => {
  beforeEach(() => {
    useCartStore.getState().clear();
    useCartStore.getState().closeCart();
  });

  it("defaults isOpen to false", () => {
    expect(useCartStore.getState().isOpen).toBe(false);
  });

  it("openCart sets isOpen to true", () => {
    useCartStore.getState().openCart();
    expect(useCartStore.getState().isOpen).toBe(true);
  });

  it("closeCart sets isOpen to false", () => {
    useCartStore.getState().openCart();
    useCartStore.getState().closeCart();
    expect(useCartStore.getState().isOpen).toBe(false);
  });

  it("setOpen toggles isOpen", () => {
    useCartStore.getState().setOpen(true);
    expect(useCartStore.getState().isOpen).toBe(true);
    useCartStore.getState().setOpen(false);
    expect(useCartStore.getState().isOpen).toBe(false);
  });
});

describe("cart store — addItem with stock clamp", () => {
  beforeEach(() => {
    useCartStore.getState().clear();
  });

  it("clamps requested quantity to totalStock", () => {
    useCartStore.getState().addItem({ ...baseItem, variantId: "low" }, 10);
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });

  it("is a no-op when variant is totally out of stock", () => {
    useCartStore.getState().addItem({ ...baseItem, variantId: "oos" }, 5);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("increments an existing line respecting the cap", () => {
    useCartStore.getState().addItem({ ...baseItem, variantId: "low" }, 2);
    useCartStore.getState().addItem({ ...baseItem, variantId: "low" }, 5);
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });

  it("caps at 99 even when stock is huge", () => {
    useCartStore.getState().addItem({ ...baseItem, variantId: "v1" }, 500);
    expect(useCartStore.getState().items[0].quantity).toBe(99);
  });
});

describe("cart store — updateQuantity with stock clamp", () => {
  beforeEach(() => {
    useCartStore.getState().clear();
    useCartStore.getState().addItem({ ...baseItem, variantId: "v1" }, 2);
  });

  it("clamps to totalStock", () => {
    useCartStore
      .getState()
      .addItem({ ...baseItem, variantId: "low" }, 1);
    useCartStore
      .getState()
      .updateQuantity({ productId: "p1", variantId: "low" }, 9);
    const line = useCartStore
      .getState()
      .items.find((i) => i.variantId === "low");
    expect(line?.quantity).toBe(3);
  });

  it("removes the line when quantity is 0 or less", () => {
    useCartStore
      .getState()
      .updateQuantity({ productId: "p1", variantId: "v1" }, 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("caps at 99", () => {
    useCartStore
      .getState()
      .updateQuantity({ productId: "p1", variantId: "v1" }, 500);
    expect(useCartStore.getState().items[0].quantity).toBe(99);
  });
});

describe("cart store — persist partialize", () => {
  beforeEach(() => {
    useCartStore.getState().clear();
    useCartStore.getState().closeCart();
    localStorage.removeItem("simplepet-cart");
  });

  it("serializes only items to localStorage, not UI state", () => {
    useCartStore.getState().openCart();
    useCartStore.getState().addItem({ ...baseItem, variantId: "v1" }, 1);
    const raw = localStorage.getItem("simplepet-cart");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.state).toHaveProperty("items");
    expect(parsed.state).not.toHaveProperty("isOpen");
  });
});
