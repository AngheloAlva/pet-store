import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddToCartButton } from "./add-to-cart-button";
import { useCartStore } from "@/stores/cart";
import { getProductBySlug } from "@/lib/catalog";
import { findVariantById } from "@/lib/pdp";

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

describe("AddToCartButton", () => {
  beforeEach(() => {
    useCartStore.getState().clear();
  });

  it("adds the product+variant+quantity to the cart on click", async () => {
    const user = userEvent.setup();
    const product = getProductBySlug("royal-canin-medium-adult")!;
    const variant = findVariantById(product, "rc-ma-8");

    render(
      <AddToCartButton product={product} variant={variant} quantity={3} />,
    );
    await user.click(screen.getByRole("button", { name: /agregar al carrito/i }));

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      variantName: variant.name,
      unitPrice: variant.price.amount,
      slug: product.slug,
      quantity: 3,
    });
  });

  it("is disabled when the variant is globally out of stock", () => {
    const product = getProductBySlug("royal-canin-medium-adult")!;
    const variant = findVariantById(product, "rc-ma-8");

    render(
      <AddToCartButton
        product={product}
        variant={variant}
        quantity={1}
        isOutOfStock
      />,
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
