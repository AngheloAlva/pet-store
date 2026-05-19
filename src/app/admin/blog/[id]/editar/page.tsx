"use server";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostById } from "@/lib/admin/blog";
import { BlogPostForm } from "@/components/admin/blog/blog-post-form";
import {
  publishBlogPost,
  unpublishBlogPost,
  archiveBlogPost,
} from "@/app/actions/admin/blog";
import { db } from "@/db";
import { products, productCategories } from "@/db/schema";
import { eq } from "drizzle-orm";

type Props = {
  params: Promise<{ id: string }>;
};

async function getProductsForForm() {
  try {
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        categoryId: productCategories.categoryId,
      })
      .from(products)
      .leftJoin(productCategories, eq(productCategories.productId, products.id));

    const seen = new Set<string>();
    const result: { id: string; name: string; category: string }[] = [];
    for (const row of rows) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        result.push({ id: row.id, name: row.name, category: row.categoryId ?? "" });
      }
    }
    return result;
  } catch {
    return [];
  }
}

export default async function EditarBlogPostPage({ params }: Props) {
  const { id } = await params;
  const [post, productsForForm] = await Promise.all([getPostById(id), getProductsForForm()]);

  if (!post) {
    notFound();
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
        <h1 className="text-xl font-semibold text-foreground">Editar artículo</h1>
      </div>

      {/* Main edit form */}
      <div className="rounded-xl border border-border bg-card p-6">
        <BlogPostForm mode="edit" post={post} products={productsForForm} />
      </div>

      {/* Status transition buttons — separate forms */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Estado del artículo</h2>
        <div className="flex flex-wrap gap-3">
          {post.status !== "published" && (
            <form
              action={async () => {
                "use server";
                await publishBlogPost({ id: post.id, currentPublishedAt: post.publishedAt });
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Publicar
              </button>
            </form>
          )}

          {post.status === "published" && (
            <form
              action={async () => {
                "use server";
                await unpublishBlogPost({ id: post.id });
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Despublicar
              </button>
            </form>
          )}

          {post.status !== "archived" && (
            <form
              action={async () => {
                "use server";
                await archiveBlogPost({ id: post.id });
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center rounded-md border border-destructive/50 text-destructive px-4 py-2 text-sm font-medium hover:bg-destructive/10"
              >
                Archivar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
