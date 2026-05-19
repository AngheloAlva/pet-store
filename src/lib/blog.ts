import { db } from "@/db";
import { blogPosts, blogPostProducts, products } from "@/db/schema";
import { eq, and, desc, sql, type SQL } from "drizzle-orm";
import type { BlogCategory } from "@/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type BlogPostRow = {
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

export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription: string | null;
  species: string[];
  tags: string[];
  featured: boolean;
};

// ---------------------------------------------------------------------------
// listPublishedPosts
// ---------------------------------------------------------------------------
export async function listPublishedPosts(opts: {
  category?: BlogCategory | string;
  species?: string;
  limit?: number;
  offset?: number;
}): Promise<BlogPostRow[]> {
  const { category, species, limit = 24, offset = 0 } = opts;

  const conditions: SQL[] = [eq(blogPosts.status, "published")];
  if (category) conditions.push(eq(blogPosts.category, category));
  if (species) conditions.push(sql`${blogPosts.species} && ARRAY[${species}]::text[]`);

  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

  const rows = await db
    .select()
    .from(blogPosts)
    .where(whereClause)
    .orderBy(desc(blogPosts.publishedAt))
    .limit(limit)
    .offset(offset);

  return rows as BlogPostRow[];
}

// ---------------------------------------------------------------------------
// getRelatedProducts
// ---------------------------------------------------------------------------
export async function getRelatedProducts(postId: string): Promise<PublicProduct[]> {
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      description: products.description,
      shortDescription: products.shortDescription,
      species: products.species,
      tags: products.tags,
      featured: products.featured,
    })
    .from(products)
    .innerJoin(blogPostProducts, eq(blogPostProducts.productId, products.id))
    .where(eq(blogPostProducts.postId, postId));

  return rows as PublicProduct[];
}

// ---------------------------------------------------------------------------
// getPostBySlug
// ---------------------------------------------------------------------------
export async function getPostBySlug(
  slug: string,
): Promise<{ post: BlogPostRow; relatedProducts: PublicProduct[] } | null> {
  const rows = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug));

  const postRow = rows[0];

  if (!postRow || postRow.status !== "published") {
    return null;
  }

  const post = postRow as BlogPostRow;
  const relatedProducts = await getRelatedProducts(post.id);

  return { post, relatedProducts };
}
