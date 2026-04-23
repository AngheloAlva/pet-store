"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/product/quantity-stepper";
import { formatCLP } from "@/lib/format";
import { getVariantTotalStock } from "@/lib/stock";
import { useCartStore, type CartItem } from "@/stores/cart";

type Props = {
  item: CartItem;
};

export function CartLineItem({ item }: Props) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const max = Math.min(99, Math.max(1, getVariantTotalStock(item.variantId)));
  const lineTotal = item.unitPrice * item.quantity;
  const key = { productId: item.productId, variantId: item.variantId };

  return (
    <li className="flex gap-3 py-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/producto/${item.slug}`}
              className="block truncate text-sm font-medium text-foreground hover:underline"
            >
              {item.name}
            </Link>
            <p className="text-xs text-muted-foreground">{item.variantName}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Quitar ${item.name} del carrito`}
            onClick={() => removeItem(key)}
          >
            <X size={14} />
          </Button>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <QuantityStepper
            value={item.quantity}
            max={max}
            onChange={(next) => updateQuantity(key, next)}
          />
          <span className="text-sm font-medium tabular-nums">
            {formatCLP(lineTotal)}
          </span>
        </div>
      </div>
    </li>
  );
}
