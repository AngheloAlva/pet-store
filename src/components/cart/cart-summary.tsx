"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatCLP } from "@/lib/format";
import { computeCartTotals } from "@/lib/cart";
import { selectItems, useCartStore } from "@/stores/cart";

export function CartSummary() {
  const items = useCartStore(selectItems);
  const { subtotal, shippingLabel, total } = computeCartTotals(items);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasItems = items.length > 0;

  async function handleCheckout() {
    if (!hasItems) return;
    setError(null);
    setLoading(true);

    const idempotencyKey = crypto.randomUUID();
    const cartLines = items.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
      clientUnitPrice: item.unitPrice,
    }));

    // Dynamic import avoids server-only pulling session at component module level
    const { startCheckoutSession } = await import("@/app/actions/checkout/start-session");
    const result = await startCheckoutSession({ idempotencyKey, cartLines });

    setLoading(false);

    if (!result.ok) {
      if (result.code === "UNAUTHENTICATED") {
        router.push("/login?callbackUrl=/checkout/entrega");
        return;
      }
      setError("No se pudo iniciar el checkout. Por favor intenta nuevamente.");
      return;
    }

    router.push("/checkout/entrega");
  }

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
      {error && (
        <p className="text-center text-xs text-red-600">{error}</p>
      )}
      <Button
        type="button"
        size="lg"
        disabled={!hasItems || loading}
        onClick={handleCheckout}
        className="w-full"
      >
        {loading ? "Iniciando checkout..." : "Ir al checkout"}
      </Button>
    </div>
  );
}
