"use client";

import { useHydrated } from "@/lib/use-hydrated";
import { selectItems, useCartStore } from "@/stores/cart";
import { CartLineItem } from "@/components/cart/cart-line-item";
import { CartSummary } from "@/components/cart/cart-summary";
import { EmptyCart } from "@/components/cart/empty-cart";

export function CartPageClient() {
  const hydrated = useHydrated();
  const items = useCartStore(selectItems);

  if (!hydrated) {
    return (
      <div
        aria-hidden
        className="h-64 rounded-md border border-dashed border-border"
      />
    );
  }

  if (items.length === 0) {
    return <EmptyCart />;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <ul className="divide-y divide-border rounded-md border border-border px-4">
        {items.map((it) => (
          <CartLineItem key={`${it.productId}:${it.variantId}`} item={it} />
        ))}
      </ul>
      <aside className="lg:sticky lg:top-24 lg:self-start rounded-md border border-border p-4">
        <CartSummary />
      </aside>
    </div>
  );
}
