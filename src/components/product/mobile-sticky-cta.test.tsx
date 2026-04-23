import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileStickyCta } from "./mobile-sticky-cta";
import { useCartStore } from "@/stores/cart";
import { getProductBySlug } from "@/lib/catalog";
import { findVariantById } from "@/lib/pdp";

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

describe("MobileStickyCta", () => {
  beforeEach(() => useCartStore.getState().clear());

  it("renders formatted price and Agregar button", () => {
    const product = getProductBySlug("royal-canin-medium-adult")!;
    const variant = findVariantById(product, "rc-ma-3");
    render(<MobileStickyCta product={product} variant={variant} quantity={1} />);
    expect(screen.getByText(/\$24\.990/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /agregar/i })).toBeInTheDocument();
  });

  it("dispatches the same cart payload as the desktop button on click", async () => {
    const user = userEvent.setup();
    const product = getProductBySlug("royal-canin-medium-adult")!;
    const variant = findVariantById(product, "rc-ma-8");
    render(<MobileStickyCta product={product} variant={variant} quantity={2} />);
    await user.click(screen.getByRole("button", { name: /agregar/i }));
    const items = useCartStore.getState().items;
    expect(items[0]).toMatchObject({
      productId: product.id,
      variantId: variant.id,
      quantity: 2,
    });
  });

  it("is hidden on md and up via responsive class", () => {
    const product = getProductBySlug("royal-canin-medium-adult")!;
    const variant = findVariantById(product, "rc-ma-3");
    const { container } = render(
      <MobileStickyCta product={product} variant={variant} quantity={1} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/md:hidden/);
  });
});
