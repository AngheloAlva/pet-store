import type { Image, LifeStage, Money, Quantity, Size, Species } from "./common";

export type ProductVariant = {
  id: string;
  sku: string;
  name: string;
  quantity: Quantity;
  price: Money;
  compareAtPrice?: Money;
  barcode?: string;
};

export type ProductTag = "new" | "sale" | "bestseller" | "exclusive" | "natural" | "grain-free";

export type Product = {
  id: string;
  slug: string;
  name: string;
  brandId: string;
  categoryIds: string[];
  species: Species[];
  lifeStage?: LifeStage;
  targetSize?: Size[];
  description: string;
  shortDescription?: string;
  images: Image[];
  variants: ProductVariant[];
  tags: ProductTag[];
  ingredients?: string;
  nutritionalAnalysis?: Record<string, string>;
  featured?: boolean;
  // F3.5 — subscription config (optional with defaults: false, [], 0)
  subscriptionEnabled?: boolean;
  subscriptionFrequencies?: number[];
  subscriptionDiscountPercent?: number;
};
