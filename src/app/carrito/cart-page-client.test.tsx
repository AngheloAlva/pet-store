import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CartPageClient } from "./cart-page-client";
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

describe("CartPageClient", () => {
  beforeEach(() => {
    useCartStore.getState().clear();
  });

  it("renders EmptyCart when hydrated and empty", () => {
    render(<CartPageClient />);
    expect(screen.getByText(/carrito está vacío/i)).toBeInTheDocument();
  });

  it("renders line items and summary when items exist", () => {
    useCartStore.getState().addItem(line, 2);
    render(<CartPageClient />);
    expect(
      screen.getByRole("link", { name: /pro plan adulto 15kg/i }),
    ).toBeInTheDocument();
    // total shown twice (subtotal + total)
    expect(screen.getAllByText(/\$\s*9\.980/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: /ir al checkout/i })).not.toBeDisabled();
  });
});
