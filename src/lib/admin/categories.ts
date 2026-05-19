/**
 * Admin category loaders — shaped for the admin UI.
 * TODO: add pagination if list exceeds 50 categories.
 */
import { db, dbReady } from "@/db";
import { categories, productCategories } from "@/db/schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  species: string | null;
  order: number;
};

// ---------------------------------------------------------------------------
// loadCategoriesFlat
// ---------------------------------------------------------------------------
/**
 * Returns all categories sorted by (parentId NULLS FIRST, order).
 * Parents come first, then each parent's children sorted by order.
 */
export async function loadCategoriesFlat(): Promise<CategoryRow[]> {
  await dbReady;

  const rows = await db.query.categories.findMany();

  // Sort: nulls first (parents), then by parentId grouping, then by order
  const parents = rows
    .filter((r) => r.parentId == null)
    .sort((a, b) => a.order - b.order);

  const result: CategoryRow[] = [];
  for (const parent of parents) {
    result.push({
      id: parent.id,
      slug: parent.slug,
      name: parent.name,
      parentId: parent.parentId,
      species: parent.species,
      order: parent.order,
    });
    const children = rows
      .filter((r) => r.parentId === parent.id)
      .sort((a, b) => a.order - b.order);
    for (const child of children) {
      result.push({
        id: child.id,
        slug: child.slug,
        name: child.name,
        parentId: child.parentId,
        species: child.species,
        order: child.order,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// hasChildCategories
// ---------------------------------------------------------------------------
export async function hasChildCategories(id: string): Promise<boolean> {
  await dbReady;
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.parentId, id));
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// hasLinkedProducts
// ---------------------------------------------------------------------------
export async function hasLinkedProducts(id: string): Promise<boolean> {
  await dbReady;
  const rows = await db
    .select({ productId: productCategories.productId })
    .from(productCategories)
    .where(eq(productCategories.categoryId, id));
  return rows.length > 0;
}
