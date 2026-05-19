import { describe, it, expect } from "vitest";

describe("blog schemas (3.1)", () => {
  it("createBlogPostSchema parses valid input", async () => {
    const { createBlogPostSchema } = await import("./blog.schema");
    const result = createBlogPostSchema.safeParse({
      slug: "cuidados-basicos-para-perros",
      title: "Cuidados básicos para perros",
      excerpt: "Todo lo que necesitas saber para cuidar a tu perro.",
      bodyMarkdown: "# Cuidados\n\nAquí van los cuidados...",
      heroImageUrl: "https://example.com/hero.jpg",
      category: "cuidados",
      species: ["dog"],
      tags: ["perros", "cuidados"],
      authorName: "Dr. Martínez",
      status: "draft",
      relatedProductIds: [],
    });
    expect(result.success).toBe(true);
  });

  it("createBlogPostSchema rejects missing required fields", async () => {
    const { createBlogPostSchema } = await import("./blog.schema");
    const result = createBlogPostSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0]);
      expect(fields).toContain("title");
      expect(fields).toContain("excerpt");
      expect(fields).toContain("bodyMarkdown");
      expect(fields).toContain("category");
      expect(fields).toContain("authorName");
    }
  });

  it("createBlogPostSchema rejects invalid category", async () => {
    const { createBlogPostSchema } = await import("./blog.schema");
    const result = createBlogPostSchema.safeParse({
      slug: "test-slug",
      title: "Title",
      excerpt: "Excerpt",
      bodyMarkdown: "# Body",
      category: "invalid_category",
      authorName: "Author",
    });
    expect(result.success).toBe(false);
  });

  it("updateBlogPostSchema requires id", async () => {
    const { updateBlogPostSchema } = await import("./blog.schema");
    const noId = updateBlogPostSchema.safeParse({
      slug: "test-slug",
      title: "Title",
      excerpt: "Excerpt",
      bodyMarkdown: "# Body",
      category: "cuidados",
      authorName: "Author",
    });
    expect(noId.success).toBe(false);

    const withId = updateBlogPostSchema.safeParse({
      id: "post-abc",
      slug: "test-slug",
      title: "Title",
      excerpt: "Excerpt",
      bodyMarkdown: "# Body",
      category: "cuidados",
      authorName: "Author",
    });
    expect(withId.success).toBe(true);
  });
});
