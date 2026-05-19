import { vi, describe, it, expect } from "vitest";

vi.mock("@/lib/blog", () => ({
  listPublishedPosts: vi.fn(async () => []),
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

import { render, screen } from "@testing-library/react";
import { listPublishedPosts } from "@/lib/blog";

const mockListPublishedPosts = vi.mocked(listPublishedPosts);

const makePost = (overrides: Record<string, unknown> = {}) => ({
  id: "post-1",
  slug: "cuidados-perros",
  title: "Cuidados para perros",
  excerpt: "Extracto del artículo sobre perros.",
  bodyMarkdown: "# Body",
  heroImageUrl: null,
  category: "cuidados",
  species: ["dog"],
  tags: [],
  authorName: "Autor",
  status: "published",
  publishedAt: new Date("2026-05-01T10:00:00Z"),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("Public /blog page (9.1 / 9.2)", () => {
  it("S-PUBLIC-1: renders BlogPostCard for published posts", async () => {
    mockListPublishedPosts.mockResolvedValueOnce([
      makePost(),
      makePost({ id: "post-2", slug: "salud-gatos", title: "Salud en gatos" }),
    ]);

    const { default: BlogPage } = await import("./page");
    render(await (BlogPage as (props: { searchParams: Promise<Record<string, string>> }) => Promise<React.ReactElement>)({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Cuidados para perros")).toBeInTheDocument();
    expect(screen.getByText("Salud en gatos")).toBeInTheDocument();
  });

  it("S-PUBLIC-2: passes category filter from searchParams to loader", async () => {
    mockListPublishedPosts.mockResolvedValueOnce([makePost({ category: "salud" })]);

    const { default: BlogPage } = await import("./page");
    await (BlogPage as (props: { searchParams: Promise<Record<string, string>> }) => Promise<React.ReactElement>)({ searchParams: Promise.resolve({ category: "salud" }) });

    expect(mockListPublishedPosts).toHaveBeenCalledWith(
      expect.objectContaining({ category: "salud" }),
    );
  });

  it("shows empty state when no posts match", async () => {
    mockListPublishedPosts.mockResolvedValueOnce([]);

    const { default: BlogPage } = await import("./page");
    render(await (BlogPage as (props: { searchParams: Promise<Record<string, string>> }) => Promise<React.ReactElement>)({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText(/no hay artículos/i)).toBeInTheDocument();
  });
});
