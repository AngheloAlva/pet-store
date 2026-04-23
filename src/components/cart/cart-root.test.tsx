import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CartRoot } from "./cart-root";
import { useCartStore } from "@/stores/cart";

describe("CartRoot", () => {
  it("mounts the CartDrawer (opens via store)", () => {
    useCartStore.getState().clear();
    useCartStore.getState().openCart();
    render(<CartRoot />);
    expect(screen.getByText("Tu carrito")).toBeInTheDocument();
    useCartStore.getState().closeCart();
  });
});
