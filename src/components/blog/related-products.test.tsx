import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { RelatedProducts } from "./related-products";

const makeProduct = (id: string, name: string) => ({
  id,
  slug: `product-${id}`,
  name,
  description: "Descripción del producto",
  shortDescription: null,
  species: ["dog"],
  tags: [],
  featured: false,
});

describe("RelatedProducts (8.3)", () => {
  it("renders N product cards", () => {
    const products = [
      makeProduct("1", "Royal Canin Adulto"),
      makeProduct("2", "Pro Plan Cachorros"),
      makeProduct("3", "Hill's Science Diet"),
    ];
    render(<RelatedProducts products={products} />);
    expect(screen.getByText("Royal Canin Adulto")).toBeInTheDocument();
    expect(screen.getByText("Pro Plan Cachorros")).toBeInTheDocument();
    expect(screen.getByText("Hill's Science Diet")).toBeInTheDocument();
  });

  it("renders nothing (hidden) when products is empty", () => {
    const { container } = render(<RelatedProducts products={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
