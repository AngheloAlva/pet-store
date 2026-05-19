"use server";

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  products,
  productCategories,
  productImages,
  productVariants,
  stockLevels,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type ZodFlatError,
} from "./products.schema";

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/");
  }
  return user;
}

// ---------------------------------------------------------------------------
// createProduct
// ---------------------------------------------------------------------------
export async function createProduct(
  input: unknown,
): Promise<{ ok: true; id: string } | { ok: false; errors: ZodFlatError }> {
  await requireAdmin();

  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten() };
  }

  const data: CreateProductInput = parsed.data;
  const id = crypto.randomUUID();

  await db.transaction(async (tx) => {
    // 1. Insert product
    await tx.insert(products).values({
      id,
      slug: data.slug,
      name: data.name,
      brandId: data.brandId,
      description: data.description,
      shortDescription: data.shortDescription ?? null,
      species: data.species as string[],
      tags: data.tags as string[],
      targetSize: data.targetSize ?? null,
      lifeStage: data.lifeStage ?? null,
      ingredients: data.ingredients ?? null,
      featured: data.featured,
    });

    // 2. Insert categories
    if (data.categoryIds.length > 0) {
      await tx.insert(productCategories).values(
        data.categoryIds.map((categoryId) => ({ productId: id, categoryId })),
      );
    }

    // 3. Insert images
    for (let i = 0; i < data.images.length; i++) {
      const img = data.images[i];
      await tx.insert(productImages).values({
        id: crypto.randomUUID(),
        productId: id,
        url: img.url,
        alt: img.alt,
        sortOrder: i,
      });
    }

    // 4. Insert variants + stock levels
    for (const variant of data.variants) {
      const variantId = crypto.randomUUID();
      await tx.insert(productVariants).values({
        id: variantId,
        productId: id,
        sku: variant.sku,
        name: variant.name,
        quantityValue: String(variant.quantityValue),
        quantityUnit: variant.quantityUnit,
        priceAmount: variant.priceAmount,
        priceCurrency: "CLP",
        compareAtAmount: variant.compareAtAmount ?? null,
        compareAtCurrency: variant.compareAtAmount != null ? "CLP" : null,
        barcode: variant.barcode ?? null,
      });

      for (const [storeId, status] of Object.entries(variant.stockByStore)) {
        await tx.insert(stockLevels).values({
          variantId,
          storeId,
          status,
        });
      }
    }
  });

  revalidatePath("/admin/productos");
  // TODO: revalidate public catalog paths ("/", "/catalogo") when non-demo mode is active

  return { ok: true, id };
}

// ---------------------------------------------------------------------------
// updateProduct
// ---------------------------------------------------------------------------
export async function updateProduct(
  id: string,
  input: unknown,
): Promise<{ ok: true } | { ok: false; errors: ZodFlatError }> {
  await requireAdmin();

  const parsed = updateProductSchema.safeParse({ ...(input as object), id });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten() };
  }

  const data = parsed.data;

  const result = await db.transaction(async (tx) => {
    // Check product exists
    const existing = await tx
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id));

    if (existing.length === 0) {
      return {
        ok: false as const,
        errors: {
          formErrors: ["Producto no encontrado"],
          fieldErrors: {},
        } as ZodFlatError,
      };
    }

    // Update product row
    await tx
      .update(products)
      .set({
        slug: data.slug,
        name: data.name,
        brandId: data.brandId,
        description: data.description,
        shortDescription: data.shortDescription ?? null,
        species: data.species as string[],
        tags: data.tags as string[],
        targetSize: data.targetSize ?? null,
        lifeStage: data.lifeStage ?? null,
        ingredients: data.ingredients ?? null,
        featured: data.featured,
      })
      .where(eq(products.id, id));

    // Delete-and-reinsert categories
    await tx.delete(productCategories).where(eq(productCategories.productId, id));
    if (data.categoryIds.length > 0) {
      await tx.insert(productCategories).values(
        data.categoryIds.map((categoryId) => ({ productId: id, categoryId })),
      );
    }

    // Delete-and-reinsert images
    await tx.delete(productImages).where(eq(productImages.productId, id));
    for (let i = 0; i < data.images.length; i++) {
      const img = data.images[i];
      await tx.insert(productImages).values({
        id: crypto.randomUUID(),
        productId: id,
        url: img.url,
        alt: img.alt,
        sortOrder: i,
      });
    }

    // Diff variants: get existing variant ids
    const existingVariants = await tx
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.productId, id));

    const existingVariantIds = new Set(existingVariants.map((v) => v.id));
    const incomingVariantIds = new Set(
      data.variants.filter((v) => v.id).map((v) => v.id!),
    );

    // Delete missing variants (and their stock levels first)
    const toDelete = [...existingVariantIds].filter((vid) => !incomingVariantIds.has(vid));
    if (toDelete.length > 0) {
      await tx.delete(stockLevels).where(inArray(stockLevels.variantId, toDelete));
      await tx.delete(productVariants).where(inArray(productVariants.id, toDelete));
    }

    // Update kept variants, insert new ones
    for (const variant of data.variants) {
      if (variant.id && existingVariantIds.has(variant.id)) {
        // Update existing variant
        await tx
          .update(productVariants)
          .set({
            sku: variant.sku,
            name: variant.name,
            quantityValue: String(variant.quantityValue),
            quantityUnit: variant.quantityUnit,
            priceAmount: variant.priceAmount,
            priceCurrency: "CLP",
            compareAtAmount: variant.compareAtAmount ?? null,
            compareAtCurrency: variant.compareAtAmount != null ? "CLP" : null,
            barcode: variant.barcode ?? null,
          })
          .where(eq(productVariants.id, variant.id));

        // Delete and reinsert stock levels for this variant
        await tx.delete(stockLevels).where(eq(stockLevels.variantId, variant.id));
        for (const [storeId, status] of Object.entries(variant.stockByStore)) {
          await tx.insert(stockLevels).values({
            variantId: variant.id,
            storeId,
            status,
          });
        }
      } else {
        // Insert new variant
        const variantId = crypto.randomUUID();
        await tx.insert(productVariants).values({
          id: variantId,
          productId: id,
          sku: variant.sku,
          name: variant.name,
          quantityValue: String(variant.quantityValue),
          quantityUnit: variant.quantityUnit,
          priceAmount: variant.priceAmount,
          priceCurrency: "CLP",
          compareAtAmount: variant.compareAtAmount ?? null,
          compareAtCurrency: variant.compareAtAmount != null ? "CLP" : null,
          barcode: variant.barcode ?? null,
        });

        for (const [storeId, status] of Object.entries(variant.stockByStore)) {
          await tx.insert(stockLevels).values({
            variantId,
            storeId,
            status,
          });
        }
      }
    }

    return { ok: true as const };
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${id}/editar`, "page");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// deleteProduct
// ---------------------------------------------------------------------------
export async function deleteProduct(id: string): Promise<{ ok: true }> {
  await requireAdmin();

  await db.transaction(async (tx) => {
    // Get all variant ids for this product
    const variants = await tx
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.productId, id));

    const variantIds = variants.map((v) => v.id);

    // Delete in reverse FK order
    if (variantIds.length > 0) {
      await tx.delete(stockLevels).where(inArray(stockLevels.variantId, variantIds));
    }
    await tx.delete(productVariants).where(eq(productVariants.productId, id));
    await tx.delete(productImages).where(eq(productImages.productId, id));
    await tx.delete(productCategories).where(eq(productCategories.productId, id));
    await tx.delete(products).where(eq(products.id, id));
  });

  revalidatePath("/admin/productos");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// bulkDeleteProducts
// ---------------------------------------------------------------------------
export async function bulkDeleteProducts(
  ids: string[],
): Promise<{ ok: true; deleted: number }> {
  await requireAdmin();

  await db.transaction(async (tx) => {
    for (const id of ids) {
      const variants = await tx
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(eq(productVariants.productId, id));

      const variantIds = variants.map((v) => v.id);

      if (variantIds.length > 0) {
        await tx.delete(stockLevels).where(inArray(stockLevels.variantId, variantIds));
      }
      await tx.delete(productVariants).where(eq(productVariants.productId, id));
      await tx.delete(productImages).where(eq(productImages.productId, id));
      await tx.delete(productCategories).where(eq(productCategories.productId, id));
      await tx.delete(products).where(eq(products.id, id));
    }
  });

  revalidatePath("/admin/productos");

  return { ok: true, deleted: ids.length };
}

// ---------------------------------------------------------------------------
// bulkToggleFeatured
// ---------------------------------------------------------------------------
export async function bulkToggleFeatured(
  ids: string[],
  featured: boolean,
): Promise<{ ok: true }> {
  await requireAdmin();

  await db.transaction(async (tx) => {
    await tx
      .update(products)
      .set({ featured })
      .where(inArray(products.id, ids));
  });

  revalidatePath("/admin/productos");

  return { ok: true };
}
