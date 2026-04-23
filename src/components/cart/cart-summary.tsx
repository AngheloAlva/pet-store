"use client";

import { Button } from "@/components/ui/button";
import { formatCLP } from "@/lib/format";
import { computeCartTotals } from "@/lib/cart";
import { selectItems, useCartStore } from "@/stores/cart";

export function CartSummary() {
  const items = useCartStore(selectItems);
  const { subtotal, shippingLabel, total } = computeCartTotals(items);

  return (
    <div className="flex flex-col gap-3">
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-medium tabular-nums">{formatCLP(subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Despacho</dt>
          <dd className="text-sm text-muted-foreground">{shippingLabel}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2">
          <dt className="font-heading text-base">Total</dt>
          <dd className="font-heading text-base font-semibold tabular-nums">
            {formatCLP(total)}
          </dd>
        </div>
      </dl>
      <div className="flex flex-col gap-1">
        <Button type="button" size="lg" disabled className="w-full">
          Ir al checkout
        </Button>
        <p className="text-center text-xs text-muted-foreground">Próximamente</p>
      </div>
    </div>
  );
}
