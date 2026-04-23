import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductBreadcrumb } from "./product-breadcrumb";
import { getProductBySlug } from "@/lib/catalog";

describe("ProductBreadcrumb", () => {
  it("renders Inicio, top-level category, and product name", () => {
    const product = getProductBySlug("royal-canin-medium-adult")!;
    render(<ProductBreadcrumb product={product} />);
    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Perros" })).toHaveAttribute(
      "href",
      "/catalogo?categoria=perros",
    );
    expect(screen.getByText(product.name)).toBeInTheDocument();
  });

  it("marks the current product as aria-current page", () => {
    const product = getProductBySlug("royal-canin-medium-adult")!;
    render(<ProductBreadcrumb product={product} />);
    const currentCrumb = screen.getByText(product.name);
    expect(currentCrumb).toHaveAttribute("aria-current", "page");
  });

  it("renders only Inicio and product when no category chain is found", () => {
    const product = {
      ...getProductBySlug("royal-canin-medium-adult")!,
      categoryIds: ["does-not-exist"],
    };
    render(<ProductBreadcrumb product={product} />);
    expect(screen.getByRole("link", { name: "Inicio" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Perros" })).toBeNull();
  });
});
