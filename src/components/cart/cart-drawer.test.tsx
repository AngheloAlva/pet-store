import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartDrawer } from "./cart-drawer";
import { useCartStore } from "@/stores/cart";

const line = {
  productId: "p1",
  variantId: "v1",
  name: "Pro Plan Adulto 15kg",
  variantName: "15 kg",
  image: "",
  unitPrice: 4990,
  slug: "pro-plan-adulto",
};

describe("CartDrawer", () => {
  beforeEach(() => {
    useCartStore.getState().clear();
    useCartStore.getState().closeCart();
  });

  it("is closed by default (no title visible)", () => {
    render(<CartDrawer />);
    expect(screen.queryByText("Tu carrito")).toBeNull();
  });

  it("renders the sheet title when opened via the store", () => {
    useCartStore.getState().openCart();
    render(<CartDrawer />);
    expect(screen.getByText("Tu carrito")).toBeInTheDocument();
  });

  it("renders EmptyCart when the cart is empty", () => {
    useCartStore.getState().openCart();
    render(<CartDrawer />);
    expect(screen.getByText(/carrito está vacío/i)).toBeInTheDocument();
  });

  it("renders line items when the cart has items", () => {
    useCartStore.getState().addItem(line, 1);
    useCartStore.getState().openCart();
    render(<CartDrawer />);
    expect(
      screen.getByRole("link", { name: /pro plan adulto 15kg/i }),
    ).toBeInTheDocument();
  });

  it("closes when setOpen(false) is invoked (e.g. via Escape)", () => {
    useCartStore.getState().openCart();
    render(<CartDrawer />);
    expect(useCartStore.getState().isOpen).toBe(true);
    act(() => {
      useCartStore.getState().setOpen(false);
    });
    expect(useCartStore.getState().isOpen).toBe(false);
  });

  it("responds to Escape keypress", async () => {
    const user = userEvent.setup();
    useCartStore.getState().openCart();
    render(<CartDrawer />);
    await user.keyboard("{Escape}");
    expect(useCartStore.getState().isOpen).toBe(false);
  });
});
