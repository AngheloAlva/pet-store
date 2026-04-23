import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductPrice } from "./product-price";
import { getProductBySlug } from "@/lib/catalog";
import { findVariantById } from "@/lib/pdp";

describe("ProductPrice", () => {
  const product = () => getProductBySlug("royal-canin-medium-adult")!;

  it("renders price in CLP without decimals", () => {
    const variant = findVariantById(product(), "rc-ma-3");
    render(<ProductPrice variant={variant} />);
    expect(screen.getByText(/\$24\.990/)).toBeInTheDocument();
  });

  it("renders strike-through compareAtPrice and discount badge when on sale", () => {
    const variant = findVariantById(product(), "rc-ma-15");
    render(<ProductPrice variant={variant} />);
    expect(screen.getByText(/\$79\.990/)).toBeInTheDocument();
    const compareAt = screen.getByText(/\$89\.990/);
    expect(compareAt).toBeInTheDocument();
    expect(compareAt).toHaveClass("line-through");
    expect(screen.getByText(/-11%/)).toBeInTheDocument();
  });

  it("does not render compareAtPrice when absent", () => {
    const variant = findVariantById(product(), "rc-ma-3");
    render(<ProductPrice variant={variant} />);
    expect(screen.queryByText(/line-through/i)).toBeNull();
  });
});
