import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductInfoTabs } from "./product-info-tabs";
import { getProductBySlug } from "@/lib/catalog";

describe("ProductInfoTabs", () => {
  it("always renders the Descripción tab", () => {
    const product = getProductBySlug("royal-canin-medium-adult")!;
    render(<ProductInfoTabs product={product} />);
    expect(
      screen.getByRole("tab", { name: /descripción/i }),
    ).toBeInTheDocument();
  });

  it("hides the Nutrición tab when nutritionalAnalysis is absent", () => {
    const product = getProductBySlug("royal-canin-medium-adult")!;
    // seed RC product has no nutritionalAnalysis
    render(<ProductInfoTabs product={product} />);
    expect(screen.queryByRole("tab", { name: /nutrición/i })).toBeNull();
  });

  it("hides the Ingredientes tab when ingredients is absent", () => {
    const product = getProductBySlug("royal-canin-medium-adult")!;
    render(<ProductInfoTabs product={product} />);
    expect(screen.queryByRole("tab", { name: /ingredientes/i })).toBeNull();
  });
});
