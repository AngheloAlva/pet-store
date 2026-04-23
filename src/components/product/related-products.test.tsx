import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RelatedProducts } from "./related-products";
import { getProductBySlug } from "@/lib/catalog";

describe("RelatedProducts", () => {
  it("renders at most 4 related products", () => {
    const product = getProductBySlug("royal-canin-medium-adult")!;
    render(<RelatedProducts product={product} />);
    const links = screen.getAllByRole("link");
    // Each ProductCard has 2 links (image + title). 4 cards → 8 links max.
    expect(links.length).toBeLessThanOrEqual(8);
  });

  it("does not include the current product in the related list", () => {
    const product = getProductBySlug("royal-canin-medium-adult")!;
    render(<RelatedProducts product={product} />);
    expect(screen.queryAllByText(product.name).length).toBe(0);
  });

  it("renders nothing when there are no related products", () => {
    // Fake product with unique everything so no one matches.
    const fake = {
      ...getProductBySlug("royal-canin-medium-adult")!,
      id: "unique-test-product",
      slug: "unique-test-product",
      brandId: "nonexistent-brand",
      categoryIds: ["nonexistent-category"],
      species: ["other" as const],
    };
    const { container } = render(<RelatedProducts product={fake} />);
    expect(container.firstChild).toBeNull();
  });
});
