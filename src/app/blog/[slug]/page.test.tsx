import { vi, describe, it, expect } from "vitest";

vi.mock("@/lib/blog", () => ({
  getPostBySlug: vi.fn(async () => null),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: React.ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

vi.mock("@/components/blog/blog-post-body", () => ({
  BlogPostBody: ({ markdown }: { markdown: string }) => (
    <div data-testid="blog-post-body">{markdown}</div>
  ),
}));

vi.mock("@/components/blog/related-products", () => ({
  RelatedProducts: ({ products }: { products: unknown[] }) => (
    <div data-testid="related-products" data-count={products.length} />
  ),
}));

import { render, screen } from "@testing-library/react";
import { getPostBySlug } from "@/lib/blog";
import { notFound } from "next/navigation";

const mockGetPostBySlug = vi.mocked(getPostBySlug);
const mockNotFound = vi.mocked(notFound);

const makePost = (overrides: Record<string, unknown> = {}) => ({
  id: "post-1",
  slug: "cuidados-perros",
  title: "Cuidados para perros",
  excerpt: "Todo lo que necesitas saber sobre el cuidado de perros.",
  bodyMarkdown: "# Cuidados\n\nContenido completo...",
  heroImageUrl: "https://example.com/hero.jpg",
  category: "cuidados",
  species: ["dog"],
  tags: ["perros"],
  authorName: "Dr. Martínez",
  status: "published",
  publishedAt: new Date("2026-05-01T10:00:00Z"),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

type PageModule = {
  default: (props: { params: Promise<{ slug: string }> }) => Promise<React.ReactElement>;
  generateMetadata: (props: { params: Promise<{ slug: string }> }) => Promise<Record<string, unknown>>;
};

describe("Public /blog/[slug] page (9.3 / 9.4)", () => {
  it("S-PUBLIC-3: renders BlogPostBody and RelatedProducts for published post", async () => {
    const post = makePost();
    mockGetPostBySlug.mockResolvedValueOnce({ post, relatedProducts: [] });

    const { default: BlogSlugPage } = (await import("./page")) as PageModule;
    render(await BlogSlugPage({ params: Promise.resolve({ slug: "cuidados-perros" }) }));

    expect(screen.getByTestId("blog-post-body")).toBeInTheDocument();
    expect(screen.getByTestId("related-products")).toBeInTheDocument();
  });

  it("S-PUBLIC-3: renders post title and excerpt", async () => {
    const post = makePost();
    mockGetPostBySlug.mockResolvedValueOnce({ post, relatedProducts: [] });

    const { default: BlogSlugPage } = (await import("./page")) as PageModule;
    render(await BlogSlugPage({ params: Promise.resolve({ slug: "cuidados-perros" }) }));

    expect(screen.getByText("Cuidados para perros")).toBeInTheDocument();
    expect(screen.getByText(/Todo lo que necesitas saber/)).toBeInTheDocument();
  });

  it("S-PUBLIC-4: calls notFound() when post is null", async () => {
    mockGetPostBySlug.mockResolvedValueOnce(null);

    const { default: BlogSlugPage } = (await import("./page")) as PageModule;
    await expect(
      BlogSlugPage({ params: Promise.resolve({ slug: "not-found-slug" }) }),
    ).rejects.toThrow("NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("S-PUBLIC-5: generateMetadata returns title, description, and og:image", async () => {
    const post = makePost();
    mockGetPostBySlug.mockResolvedValueOnce({ post, relatedProducts: [] });

    const { generateMetadata } = (await import("./page")) as PageModule;
    const meta = await generateMetadata({ params: Promise.resolve({ slug: "cuidados-perros" }) });

    expect(meta.title).toBe("Cuidados para perros");
    expect(meta.description).toBe("Todo lo que necesitas saber sobre el cuidado de perros.");
    const openGraph = meta.openGraph as { images?: string[] };
    expect(openGraph.images).toEqual(["https://example.com/hero.jpg"]);
  });
});
