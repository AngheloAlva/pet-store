import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CartSummary } from "./cart-summary";
import { useCartStore } from "@/stores/cart";

const line = {
  productId: "p1",
  variantId: "v1",
  name: "Prod",
  variantName: "Var",
  image: "",
  unitPrice: 4990,
  slug: "prod",
};

describe("CartSummary", () => {
  beforeEach(() => {
    useCartStore.getState().clear();
  });

  it("renders formatted subtotal, shipping label, and total", () => {
    useCartStore.getState().addItem(line, 2);
    render(<CartSummary />);
    // subtotal and total both 9980 CLP
    expect(screen.getAllByText(/\$\s*9\.980/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Se calcula en el checkout/i)).toBeInTheDocument();
  });

  it("renders a disabled checkout button with Próximamente helper text", () => {
    useCartStore.getState().addItem(line, 1);
    render(<CartSummary />);
    const btn = screen.getByRole("button", { name: /ir al checkout/i });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/próximamente/i)).toBeInTheDocument();
  });

  it("shows zero totals when cart is empty", () => {
    render(<CartSummary />);
    const zeros = screen.getAllByText(/\$\s*0/);
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });
});
