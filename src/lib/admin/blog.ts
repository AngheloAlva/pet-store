import { db } from "@/db";
import { blogPosts, blogPostProducts } from "@/db/schema";
import { eq, and, desc, type SQL } from "drizzle-orm";
import type { BlogCategory, BlogStatus } from "@/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type AdminBlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  heroImageUrl: string | null;
  category: string;
  species: string[];
  tags: string[];
  authorName: string;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminBlogPostDetail = AdminBlogPostRow & {
  relatedProductIds: string[];
};

// ---------------------------------------------------------------------------
// listAllPosts
// ---------------------------------------------------------------------------
export async function listAllPosts(opts: {
  status?: BlogStatus | string;
  category?: BlogCategory | string;
  species?: string;
}): Promise<AdminBlogPostRow[]> {
  const { status, category } = opts;

  const conditions: SQL[] = [];
  if (status) conditions.push(eq(blogPosts.status, status));
  if (category) conditions.push(eq(blogPosts.category, category));

  const whereClause =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

  const rows = whereClause
    ? await db.select().from(blogPosts).where(whereClause).orderBy(desc(blogPosts.createdAt))
    : await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));

  return rows as AdminBlogPostRow[];
}

// ---------------------------------------------------------------------------
// getPostById
// ---------------------------------------------------------------------------
export async function getPostById(id: string): Promise<AdminBlogPostDetail | null> {
  const [postRows, joinRows] = await Promise.all([
    db.select().from(blogPosts).where(eq(blogPosts.id, id)),
    db
      .select({ productId: blogPostProducts.productId })
      .from(blogPostProducts)
      .where(eq(blogPostProducts.postId, id)),
  ]);

  const post = postRows[0];
  if (!post) return null;

  return {
    ...(post as AdminBlogPostRow),
    relatedProductIds: joinRows.map((r) => r.productId),
  };
}
