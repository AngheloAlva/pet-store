"use client";

import { ShoppingCartSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart";
import type { Product, ProductVariant } from "@/types";

type Props = {
  product: Product;
  variant: ProductVariant;
  quantity: number;
  isOutOfStock?: boolean;
  variantLabel?: string;
};

export function AddToCartButton({
  product,
  variant,
  quantity,
  isOutOfStock,
  variantLabel,
}: Props) {
  const addItem = useCartStore((state) => state.addItem);

  async function handleClick() {
    addItem(
      {
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        variantName: variant.name,
        image: product.images[0]?.url ?? "",
        unitPrice: variant.price.amount,
        slug: product.slug,
      },
      quantity,
    );
    const { toast } = await import("sonner");
    toast.success(
      `${product.name}${variantLabel ? ` (${variantLabel})` : ""} agregado al carrito`,
    );
  }

  return (
    <Button
      type="button"
      size="lg"
      className="w-full"
      onClick={handleClick}
      disabled={isOutOfStock}
    >
      <ShoppingCartSimple size={18} />
      Agregar al carrito
    </Button>
  );
}
