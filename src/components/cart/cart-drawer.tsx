"use client";

import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/lib/use-hydrated";
import { selectItems, selectIsOpen, useCartStore } from "@/stores/cart";
import { CartLineItem } from "./cart-line-item";
import { CartSummary } from "./cart-summary";
import { EmptyCart } from "./empty-cart";

export function CartDrawer() {
  const hydrated = useHydrated();
  const isOpen = useCartStore(selectIsOpen);
  const items = useCartStore(selectItems);
  const setOpen = useCartStore((s) => s.setOpen);

  if (!hydrated) return null;

  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const description =
    items.length === 0
      ? "Todavía no tenés productos."
      : `${itemCount} ${itemCount === 1 ? "producto" : "productos"}`;

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle>Tu carrito</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {items.length === 0 ? (
          <EmptyCart />
        ) : (
          <>
            <ul className="flex-1 divide-y divide-border overflow-y-auto px-6">
              {items.map((it) => (
                <CartLineItem key={`${it.productId}:${it.variantId}`} item={it} />
              ))}
            </ul>
            <SheetFooter className="border-t border-border">
              <CartSummary />
              <Button
                variant="outline"
                className="w-full"
                render={<Link href="/carrito" />}
                onClick={() => setOpen(false)}
              >
                Ver carrito completo
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
