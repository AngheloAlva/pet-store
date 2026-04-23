"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { canAddToCart, findVariantById } from "@/lib/pdp";
import type { Product } from "@/types";
import { AddToCartButton } from "./add-to-cart-button";
import { MobileStickyCta } from "./mobile-sticky-cta";
import { ProductPrice } from "./product-price";
import { ProductStockList } from "./product-stock-list";
import { QuantityStepper } from "./quantity-stepper";

type Props = {
  product: Product;
};

export function ProductPurchasePanel({ product }: Props) {
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants[0].id,
  );
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = findVariantById(product, selectedVariantId);
  const available = canAddToCart(selectedVariantId);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            {product.brandId}
          </p>
          <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            {product.name}
          </h1>
        </div>

        <ProductPrice variant={selectedVariant} />

        {product.variants.length > 1 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold">Tamaño</h3>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => {
                const isSelected = v.id === selectedVariantId;
                return (
                  <Button
                    key={v.id}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    aria-pressed={isSelected}
                    className={cn(isSelected && "ring-2 ring-ring/30")}
                    onClick={() => setSelectedVariantId(v.id)}
                  >
                    {v.name}
                  </Button>
                );
              })}
            </div>
          </section>
        )}

        <ProductStockList variantId={selectedVariantId} />

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold">Cantidad</span>
            <QuantityStepper value={quantity} onChange={setQuantity} />
          </div>
          <AddToCartButton
            product={product}
            variant={selectedVariant}
            quantity={quantity}
            isOutOfStock={!available}
            variantLabel={selectedVariant.name}
          />
        </div>
      </div>

      <MobileStickyCta
        product={product}
        variant={selectedVariant}
        quantity={quantity}
        isOutOfStock={!available}
      />
    </>
  );
}
