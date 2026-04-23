import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyCart } from "./empty-cart";

describe("EmptyCart", () => {
  it("renders an empty-state message", () => {
    render(<EmptyCart />);
    expect(screen.getByText(/carrito está vacío/i)).toBeInTheDocument();
  });

  it("renders a CTA linking to the catalog", () => {
    render(<EmptyCart />);
    const link = screen.getByRole("link", { name: /ver catálogo/i });
    expect(link).toHaveAttribute("href", "/catalogo");
  });
});
