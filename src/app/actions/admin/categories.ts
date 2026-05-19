"use server";

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { categories, productCategories } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createCategorySchema,
  updateCategorySchema,
  reorderCategoriesSchema,
  type ZodFlatError,
} from "./categories.schema";

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
// createCategory
// ---------------------------------------------------------------------------
export async function createCategory(
  input: unknown,
): Promise<{ ok: true; id: string } | { ok: false; errors: ZodFlatError }> {
  await requireAdmin();

  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten() };
  }

  const data = parsed.data;
  const id = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(categories).values({
      id,
      slug: data.slug,
      name: data.name,
      parentId: data.parentId ?? null,
      species: data.species ?? null,
      order: 0,
    });
  });

  revalidatePath("/admin/categorias");

  return { ok: true, id };
}

// ---------------------------------------------------------------------------
// updateCategory
// ---------------------------------------------------------------------------
export async function updateCategory(
  id: string,
  input: unknown,
): Promise<{ ok: true } | { ok: false; errors: ZodFlatError }> {
  await requireAdmin();

  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten() };
  }

  const data = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .update(categories)
      .set({
        slug: data.slug,
        name: data.name,
        parentId: data.parentId ?? null,
        species: data.species ?? null,
      })
      .where(eq(categories.id, id));
  });

  revalidatePath("/admin/categorias");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// deleteCategory
// ---------------------------------------------------------------------------
export async function deleteCategory(
  id: string,
): Promise<{ ok: true } | { ok: false; errors: { formErrors: string[]; fieldErrors: Record<string, never> } }> {
  await requireAdmin();

  const result = await db.transaction(async (tx) => {
    // Check for child categories (R3 — self-referential guard)
    const children = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.parentId, id));

    if (children.length > 0) {
      return {
        ok: false as const,
        errors: {
          formErrors: [
            "No se puede eliminar: la categoría tiene subcategorías",
          ],
          fieldErrors: {} as Record<string, never>,
        },
      };
    }

    // Check for linked products (R3 — productCategories FK guard)
    const linked = await tx
      .select({ productId: productCategories.productId })
      .from(productCategories)
      .where(eq(productCategories.categoryId, id));

    if (linked.length > 0) {
      return {
        ok: false as const,
        errors: {
          formErrors: [
            "No se puede eliminar: la categoría tiene productos asociados",
          ],
          fieldErrors: {} as Record<string, never>,
        },
      };
    }

    await tx.delete(categories).where(eq(categories.id, id));
    return { ok: true as const };
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/admin/categorias");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// reorderCategories (S30 — single transaction)
// ---------------------------------------------------------------------------
export async function reorderCategories(
  orderedIds: string[],
): Promise<{ ok: true } | { ok: false; errors: { formErrors: string[]; fieldErrors: Record<string, never> } }> {
  await requireAdmin();

  const parsed = reorderCategoriesSchema.safeParse(orderedIds);
  if (!parsed.success) {
    return {
      ok: false,
      errors: {
        formErrors: parsed.error.flatten().formErrors,
        fieldErrors: {} as Record<string, never>,
      },
    };
  }

  await db.transaction(async (tx) => {
    for (let idx = 0; idx < orderedIds.length; idx++) {
      await tx
        .update(categories)
        .set({ order: idx })
        .where(eq(categories.id, orderedIds[idx]));
    }
  });

  revalidatePath("/admin/categorias");

  return { ok: true };
}
