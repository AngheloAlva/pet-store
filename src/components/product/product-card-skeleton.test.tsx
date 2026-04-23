import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ProductCardSkeleton } from "./product-card-skeleton";

describe("ProductCardSkeleton", () => {
  it("renders a root element with data-slot='product-card-skeleton'", () => {
    const { container } = render(<ProductCardSkeleton />);
    const root = container.querySelector('[data-slot="product-card-skeleton"]');
    expect(root).not.toBeNull();
  });

  it("contains at least 4 placeholder shapes", () => {
    const { container } = render(<ProductCardSkeleton />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(4);
  });
});
