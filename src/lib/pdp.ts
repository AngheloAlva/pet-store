import type { Product, ProductVariant } from "@/types";
import { isVariantGloballyOutOfStock } from "./stock";

export function findVariantById(
  product: Product,
  variantId: string,
): ProductVariant {
  const variant = product.variants.find((v) => v.id === variantId);
  if (!variant) {
    throw new Error(
      `Variant "${variantId}" not found on product "${product.slug}"`,
    );
  }
  return variant;
}

export function calculateDiscountPercent(
  variant: ProductVariant,
): number | null {
  if (!variant.compareAtPrice) return null;
  if (variant.compareAtPrice.amount <= variant.price.amount) return null;
  const diff = variant.compareAtPrice.amount - variant.price.amount;
  return Math.round((diff / variant.compareAtPrice.amount) * 100);
}

export function clampQuantity(n: number): number {
  if (Number.isNaN(n)) return 1;
  const floored = Math.floor(n);
  if (floored < 1) return 1;
  if (floored > 99) return 99;
  return floored;
}

export function canAddToCart(variantId: string): boolean {
  return !isVariantGloballyOutOfStock(variantId);
}
