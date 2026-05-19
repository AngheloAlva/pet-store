"use client";

import Link from "next/link";
import { ShoppingCartSimple } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyCart() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <ShoppingCartSimple size={48} weight="regular" className="text-muted-foreground" />
      <div className="space-y-1">
        <p className="font-heading text-lg text-foreground">Tu carrito está vacío</p>
        <p className="text-sm text-muted-foreground">
          Explorá el catálogo y sumá productos para tu mascota.
        </p>
      </div>
      <Link href="/catalogo" className={cn(buttonVariants())}>
        Ver catálogo
      </Link>
    </div>
  );
}
