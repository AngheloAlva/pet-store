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
import { RestockAlertForm } from "./restock-alert-form";
import { applySubscriptionDiscount } from "@/lib/subscriptions/pricing";

type PurchaseMode = "one_time" | "subscription";

type Props = {
  product: Product;
  isAuthenticated?: boolean;
  userEmail?: string;
};

export function ProductPurchasePanel({ product, isAuthenticated = false, userEmail }: Props) {
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants[0].id,
  );
  const [quantity, setQuantity] = useState(1);
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>("one_time");
  const [selectedFrequency, setSelectedFrequency] = useState<number>(
    product.subscriptionFrequencies?.[0] ?? 30,
  );

  const selectedVariant = findVariantById(product, selectedVariantId);
  const available = canAddToCart(selectedVariantId);
  const isSubscriptionEnabled = product.subscriptionEnabled === true;
  const discountPercent = product.subscriptionDiscountPercent ?? 0;
  const frequencies = product.subscriptionFrequencies ?? [];

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

        {/* Subscription toggle — only when product has subscriptions enabled */}
        {isSubscriptionEnabled && (
          <div className="flex rounded-md border border-border overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setPurchaseMode("one_time")}
              className={cn(
                "flex-1 px-3 py-2 font-medium transition-colors",
                purchaseMode === "one_time"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-muted",
              )}
            >
              Compra única
            </button>
            <button
              type="button"
              onClick={() => setPurchaseMode("subscription")}
              className={cn(
                "flex-1 px-3 py-2 font-medium transition-colors",
                purchaseMode === "subscription"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-muted",
              )}
            >
              Suscribirme
            </button>
          </div>
        )}

        {/* Frequency selector — only when subscription mode is active */}
        {isSubscriptionEnabled && purchaseMode === "subscription" && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Frecuencia de entrega</p>
            <div className="flex flex-wrap gap-2">
              {frequencies.map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setSelectedFrequency(freq)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    selectedFrequency === freq
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted",
                  )}
                >
                  Cada {freq} días
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Price — show discounted price when subscription mode is active */}
        {isSubscriptionEnabled && purchaseMode === "subscription" ? (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              ${applySubscriptionDiscount(selectedVariant.price.amount, discountPercent).toLocaleString("es-CL")}
            </span>
            <span className="text-sm text-muted-foreground line-through">
              ${selectedVariant.price.amount.toLocaleString("es-CL")}
            </span>
            <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
              {discountPercent}% dcto.
            </span>
          </div>
        ) : (
          <ProductPrice variant={selectedVariant} />
        )}

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
          {!available && (
            <RestockAlertForm
              productId={product.id}
              variantId={selectedVariantId}
              isAuthenticated={isAuthenticated}
              userEmail={userEmail}
            />
          )}
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
