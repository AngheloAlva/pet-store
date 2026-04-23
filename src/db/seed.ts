/**
 * Seed script — idempotent via ON CONFLICT DO UPDATE.
 * Run: DATABASE_URL=<url> pnpm db:seed
 *
 * Data source: src/test/fixtures/* (snapshot of src/data/*)
 * When DATABASE_URL is not set this exits with a human-readable error.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { brands, categories, products, stores, stockExceptions } from "@/test/fixtures";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  console.error("Set it before running: DATABASE_URL=postgresql://... pnpm db:seed");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

async function seed(): Promise<void> {
  console.log("🌱 Seeding database…");

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
  console.log(`  ✔ brands: ${brands.length}`);

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
  console.log(`  ✔ categories: ${categories.length}`);

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
  console.log(`  ✔ products: ${products.length}`);

  // --- product_categories (junction) ---
  const junctionRows = products.flatMap((p) =>
    p.categoryIds.map((catId) => ({ productId: p.id, categoryId: catId })),
  );
  await db
    .insert(schema.productCategories)
    .values(junctionRows)
    .onConflictDoNothing();
  console.log(`  ✔ product_categories: ${junctionRows.length}`);

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
  console.log(`  ✔ product_images: ${imageRows.length}`);

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
  console.log(`  ✔ product_variants: ${variantRows.length}`);

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
  console.log(`  ✔ stores: ${stores.length}`);

  // --- stock_levels (full variant × store cross-join + exceptions) ---
  const allVariantIds = products.flatMap((p) => p.variants.map((v) => v.id));
  const allStoreIds = stores.map((s) => s.id);

  // Build exception lookup map
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
  console.log(`  ✔ stock_levels: ${stockRows.length} (${allVariantIds.length} variants × ${allStoreIds.length} stores)`);

  console.log("✅ Seed complete");
}

seed().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("❌ Seed failed:", message);
  process.exit(1);
});
