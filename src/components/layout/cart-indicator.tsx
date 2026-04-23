"use client";

import Link from "next/link";
import { ShoppingCartSimple } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { selectTotalItems, useCartStore } from "@/stores/cart";
import { useHydrated } from "@/lib/use-hydrated";

export function CartIndicator() {
  const total = useCartStore(selectTotalItems);
  const hydrated = useHydrated();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label="Carrito"
      render={<Link href="/carrito" />}
    >
      <ShoppingCartSimple size={20} weight="regular" />
      {hydrated && total > 0 && (
        <Badge
          variant="default"
          className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full text-[10px] font-semibold tabular-nums"
        >
          {total > 99 ? "99+" : total}
        </Badge>
      )}
    </Button>
  );
}
