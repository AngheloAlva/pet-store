"use client";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart";
import { formatCLP } from "@/lib/format";
import type { Product, ProductVariant } from "@/types";

type Props = {
  product: Product;
  variant: ProductVariant;
  quantity: number;
  isOutOfStock?: boolean;
};

export function MobileStickyCta({
  product,
  variant,
  quantity,
  isOutOfStock,
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
    toast.success(`${product.name} agregado al carrito`);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur px-4 py-3 shadow-lg md:hidden">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Precio</span>
          <span className="text-lg font-semibold tabular-nums">
            {formatCLP(variant.price.amount)}
          </span>
        </div>
        <Button
          type="button"
          size="lg"
          className="flex-1"
          onClick={handleClick}
          disabled={isOutOfStock}
          aria-label="Agregar al carrito"
        >
          Agregar
        </Button>
      </div>
    </div>
  );
}
