import Link from "next/link";
import { db } from "@/db";
import { products, productCategories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { BlogPostForm } from "@/components/admin/blog/blog-post-form";

async function getProductsForForm() {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      categoryId: productCategories.categoryId,
    })
    .from(products)
    .leftJoin(productCategories, eq(productCategories.productId, products.id));

  // Deduplicate products (one row per product, use first category)
  const seen = new Set<string>();
  const result: { id: string; name: string; category: string }[] = [];
  for (const row of rows) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      result.push({
        id: row.id,
        name: row.name,
        category: row.categoryId ?? "",
      });
    }
  }
  return result;
}

export default async function NuevoBlogPostPage() {
  let productsForForm: { id: string; name: string; category: string }[] = [];
  try {
    productsForForm = await getProductsForForm();
  } catch {
    // If db not ready, use empty list
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/blog"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Blog
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-semibold text-foreground">Nuevo artículo</h1>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <BlogPostForm mode="create" products={productsForForm} />
      </div>
    </div>
  );
}
