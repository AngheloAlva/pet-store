/**
 * Seed module — idempotent via ON CONFLICT DO UPDATE / DO NOTHING.
 * Called automatically from boot() in src/db/index.ts on every cold start.
 * Not a CLI entrypoint.
 */

import * as schema from "./schema";
import { brands, categories, products, stores, stockExceptions } from "@/test/fixtures";
import { personas } from "./seed-data/personas";
import type { PgliteDatabase } from "drizzle-orm/pglite";

type Db = PgliteDatabase<typeof schema>;

export async function applySeed(db: Db): Promise<void> {
  // --- brands ---
  await db
    .insert(schema.brands)
    .values(
      brands.map((b) => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        logoUrl: b.logo?.url ?? null,
        logoAlt: b.logo?.alt ?? null,
        description: b.description ?? null,
        originCountry: null,
        website: null,
      })),
    )
    .onConflictDoUpdate({
      target: schema.brands.id,
      set: {
        slug: schema.brands.slug,
        name: schema.brands.name,
        logoUrl: schema.brands.logoUrl,
        logoAlt: schema.brands.logoAlt,
        description: schema.brands.description,
      },
    });

  // --- categories ---
  await db
    .insert(schema.categories)
    .values(
      categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        parentId: c.parentId ?? null,
        species: c.species ?? null,
        order: c.order,
      })),
    )
    .onConflictDoUpdate({
      target: schema.categories.id,
      set: {
        slug: schema.categories.slug,
        name: schema.categories.name,
        parentId: schema.categories.parentId,
        species: schema.categories.species,
        order: schema.categories.order,
      },
    });

  // --- products ---
  await db
    .insert(schema.products)
    .values(
      products.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        brandId: p.brandId,
        description: p.description,
        shortDescription: p.shortDescription ?? null,
        species: p.species,
        tags: p.tags,
        targetSize: p.targetSize ?? null,
        lifeStage: p.lifeStage ?? null,
        ingredients: p.ingredients ?? null,
        nutritionalAnalysis: p.nutritionalAnalysis ?? null,
        featured: p.featured ?? false,
      })),
    )
    .onConflictDoUpdate({
      target: schema.products.id,
      set: {
        slug: schema.products.slug,
        name: schema.products.name,
        brandId: schema.products.brandId,
        description: schema.products.description,
        shortDescription: schema.products.shortDescription,
        species: schema.products.species,
        tags: schema.products.tags,
        targetSize: schema.products.targetSize,
        lifeStage: schema.products.lifeStage,
        featured: schema.products.featured,
      },
    });

  // --- product_categories (junction) ---
  const junctionRows = products.flatMap((p) =>
    p.categoryIds.map((catId) => ({ productId: p.id, categoryId: catId })),
  );
  await db
    .insert(schema.productCategories)
    .values(junctionRows)
    .onConflictDoNothing();

  // --- product_images ---
  const imageRows = products.flatMap((p) =>
    p.images.map((img, idx) => ({
      id: `${p.id}-img-${idx}`,
      productId: p.id,
      url: img.url,
      alt: img.alt,
      sortOrder: idx,
    })),
  );
  await db
    .insert(schema.productImages)
    .values(imageRows)
    .onConflictDoUpdate({
      target: schema.productImages.id,
      set: {
        url: schema.productImages.url,
        alt: schema.productImages.alt,
        sortOrder: schema.productImages.sortOrder,
      },
    });

  // --- product_variants ---
  const variantRows = products.flatMap((p) =>
    p.variants.map((v) => ({
      id: v.id,
      productId: p.id,
      sku: v.sku,
      name: v.name,
      quantityValue: String(v.quantity.value),
      quantityUnit: v.quantity.unit,
      priceAmount: v.price.amount,
      priceCurrency: v.price.currency,
      compareAtAmount: v.compareAtPrice?.amount ?? null,
      compareAtCurrency: v.compareAtPrice?.currency ?? null,
      barcode: v.barcode ?? null,
    })),
  );
  await db
    .insert(schema.productVariants)
    .values(variantRows)
    .onConflictDoUpdate({
      target: schema.productVariants.id,
      set: {
        sku: schema.productVariants.sku,
        name: schema.productVariants.name,
        quantityValue: schema.productVariants.quantityValue,
        quantityUnit: schema.productVariants.quantityUnit,
        priceAmount: schema.productVariants.priceAmount,
        priceCurrency: schema.productVariants.priceCurrency,
        compareAtAmount: schema.productVariants.compareAtAmount,
        compareAtCurrency: schema.productVariants.compareAtCurrency,
      },
    });

  // --- stores ---
  await db
    .insert(schema.stores)
    .values(
      stores.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        address: s.address,
        commune: s.commune,
        phone: s.phone,
        lat: String(s.coordinates.lat),
        lng: String(s.coordinates.lng),
        schedule: s.schedule,
        services: s.services,
        reference: s.reference ?? null,
      })),
    )
    .onConflictDoUpdate({
      target: schema.stores.id,
      set: {
        slug: schema.stores.slug,
        name: schema.stores.name,
        address: schema.stores.address,
        commune: schema.stores.commune,
        phone: schema.stores.phone,
        lat: schema.stores.lat,
        lng: schema.stores.lng,
        schedule: schema.stores.schedule,
        services: schema.stores.services,
        reference: schema.stores.reference,
      },
    });

  // --- stock_levels (full variant × store cross-join + exceptions) ---
  const allVariantIds = products.flatMap((p) => p.variants.map((v) => v.id));
  const allStoreIds = stores.map((s) => s.id);

  const exceptionMap = new Map<string, "low_stock" | "out_of_stock">();
  for (const ex of stockExceptions) {
    exceptionMap.set(`${ex.variantId}:${ex.storeId}`, ex.status);
  }

  const stockRows = allVariantIds.flatMap((variantId) =>
    allStoreIds.map((storeId) => ({
      variantId,
      storeId,
      status: exceptionMap.get(`${variantId}:${storeId}`) ?? "in_stock",
    })),
  );

  await db
    .insert(schema.stockLevels)
    .values(stockRows)
    .onConflictDoUpdate({
      target: [schema.stockLevels.variantId, schema.stockLevels.storeId],
      set: { status: schema.stockLevels.status },
    });

  // --- demo personas ---
  await db
    .insert(schema.users)
    .values(personas)
    .onConflictDoUpdate({
      target: schema.users.id,
      set: {
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        storeId: schema.users.storeId,
      },
    });
}
