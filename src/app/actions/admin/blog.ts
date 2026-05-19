"use server";

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { blogPosts, blogPostProducts } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { slugify } from "@/lib/admin/slugify";
import {
  createBlogPostSchema,
  updateBlogPostSchema,
  type CreateBlogPostInput,
  type UpdateBlogPostInput,
  type ZodBlogFlatError,
} from "./blog.schema";

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
// createBlogPost
// ---------------------------------------------------------------------------
export async function createBlogPost(
  input: unknown,
): Promise<{ ok: true; id: string } | { ok: false; errors: ZodBlogFlatError }> {
  await requireAdmin();

  // Auto-fill slug before parse if blank
  const raw = input as Record<string, unknown> | null | undefined;
  const preparedInput =
    raw && typeof raw === "object" && !raw.slug
      ? { ...raw, slug: slugify(String(raw.title ?? "")) }
      : raw;

  const parsed = createBlogPostSchema.safeParse(preparedInput);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten() };
  }

  const data: CreateBlogPostInput = parsed.data;

  // Slug uniqueness check
  const existing = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(eq(blogPosts.slug, data.slug));

  if (existing.length > 0) {
    return {
      ok: false,
      errors: {
        formErrors: [],
        fieldErrors: { slug: ["Ya existe un artículo con ese slug"] },
      },
    };
  }

  const id = crypto.randomUUID();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(blogPosts).values({
      id,
      slug: data.slug,
      title: data.title,
      excerpt: data.excerpt,
      bodyMarkdown: data.bodyMarkdown,
      heroImageUrl: data.heroImageUrl ?? null,
      category: data.category,
      species: data.species as string[],
      tags: data.tags as string[],
      authorName: data.authorName,
      status: data.status ?? "draft",
      publishedAt: data.status === "published" ? now : null,
      createdAt: now,
      updatedAt: now,
    });

    if (data.relatedProductIds.length > 0) {
      await tx
        .insert(blogPostProducts)
        .values(data.relatedProductIds.map((productId) => ({ postId: id, productId })));
    }
  });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");

  return { ok: true, id };
}

// ---------------------------------------------------------------------------
// updateBlogPost
// ---------------------------------------------------------------------------
export async function updateBlogPost(
  input: unknown,
): Promise<{ ok: true } | { ok: false; errors: ZodBlogFlatError }> {
  await requireAdmin();

  const parsed = updateBlogPostSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten() };
  }

  const data: UpdateBlogPostInput = parsed.data;

  // Slug uniqueness check excluding self
  const existing = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, data.slug), ne(blogPosts.id, data.id)));

  if (existing.length > 0) {
    return {
      ok: false,
      errors: {
        formErrors: [],
        fieldErrors: { slug: ["Ya existe un artículo con ese slug"] },
      },
    };
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(blogPosts)
      .set({
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt,
        bodyMarkdown: data.bodyMarkdown,
        heroImageUrl: data.heroImageUrl ?? null,
        category: data.category,
        species: data.species as string[],
        tags: data.tags as string[],
        authorName: data.authorName,
        updatedAt: now,
      })
      .where(eq(blogPosts.id, data.id));

    // Atomic delete-then-insert for related products (D4)
    await tx.delete(blogPostProducts).where(eq(blogPostProducts.postId, data.id));

    if (data.relatedProductIds.length > 0) {
      await tx
        .insert(blogPostProducts)
        .values(data.relatedProductIds.map((productId) => ({ postId: data.id, productId })));
    }
  });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${data.slug}`);

  return { ok: true };
}

// ---------------------------------------------------------------------------
// publishBlogPost
// ---------------------------------------------------------------------------
export async function publishBlogPost(args: {
  id: string;
  currentPublishedAt?: Date | null;
}): Promise<{ ok: true }> {
  await requireAdmin();

  const now = new Date();

  await db
    .update(blogPosts)
    .set({
      status: "published",
      // Preserve existing publishedAt; only set if currently null/undefined
      publishedAt: args.currentPublishedAt ?? now,
      updatedAt: now,
    })
    .where(eq(blogPosts.id, args.id));

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/[slug]`);

  return { ok: true };
}

// ---------------------------------------------------------------------------
// unpublishBlogPost
// ---------------------------------------------------------------------------
export async function unpublishBlogPost(args: { id: string }): Promise<{ ok: true }> {
  await requireAdmin();

  const now = new Date();

  await db
    .update(blogPosts)
    .set({
      status: "draft",
      // publishedAt NOT touched — preserve as audit trail (S-ACTION-6)
      updatedAt: now,
    })
    .where(eq(blogPosts.id, args.id));

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/[slug]`);

  return { ok: true };
}

// ---------------------------------------------------------------------------
// archiveBlogPost
// ---------------------------------------------------------------------------
export async function archiveBlogPost(args: { id: string }): Promise<{ ok: true }> {
  await requireAdmin();

  const now = new Date();

  await db
    .update(blogPosts)
    .set({
      status: "archived",
      updatedAt: now,
    })
    .where(eq(blogPosts.id, args.id));

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/[slug]`);

  return { ok: true };
}
