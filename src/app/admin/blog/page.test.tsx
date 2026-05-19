import { vi, describe, it, expect } from "vitest";

vi.mock("@/lib/admin/blog", () => ({
  listAllPosts: vi.fn(async () => []),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { render, screen } from "@testing-library/react";
import { listAllPosts } from "@/lib/admin/blog";

const mockListAllPosts = vi.mocked(listAllPosts);

const makePost = (overrides: Record<string, unknown> = {}) => ({
  id: "post-1",
  slug: "articulo-prueba",
  title: "Artículo de prueba",
  excerpt: "Extracto",
  bodyMarkdown: "# Body",
  heroImageUrl: null,
  category: "cuidados",
  species: ["dog"],
  tags: [],
  authorName: "Autor",
  status: "draft",
  publishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

type AdminBlogPageModule = {
  default: (props: { searchParams: Promise<Record<string, string>> }) => Promise<React.ReactElement>;
};

describe("Admin /admin/blog page (11.1)", () => {
  it("S-ADMIN-1: renders posts of all statuses", async () => {
    mockListAllPosts.mockResolvedValueOnce([
      makePost({ status: "draft", title: "Draft Post" }),
      makePost({ id: "post-2", slug: "published", title: "Published Post", status: "published" }),
      makePost({ id: "post-3", slug: "archived", title: "Archived Post", status: "archived" }),
    ]);

    const { default: AdminBlogPage } = (await import("./page")) as AdminBlogPageModule;
    render(await AdminBlogPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Draft Post")).toBeInTheDocument();
    expect(screen.getByText("Published Post")).toBeInTheDocument();
    expect(screen.getByText("Archived Post")).toBeInTheDocument();
  });

  it("passes status filter from searchParams to loader", async () => {
    mockListAllPosts.mockResolvedValueOnce([makePost({ status: "published" })]);

    const { default: AdminBlogPage } = (await import("./page")) as AdminBlogPageModule;
    await AdminBlogPage({ searchParams: Promise.resolve({ status: "published" }) });

    expect(mockListAllPosts).toHaveBeenCalledWith(
      expect.objectContaining({ status: "published" }),
    );
  });

  it("shows 'Nuevo artículo' CTA link", async () => {
    mockListAllPosts.mockResolvedValueOnce([]);

    const { default: AdminBlogPage } = (await import("./page")) as AdminBlogPageModule;
    render(await AdminBlogPage({ searchParams: Promise.resolve({}) }));

    const link = screen.getAllByRole("link").find((l) =>
      l.textContent?.includes("Nuevo artículo"),
    );
    expect(link).toBeInTheDocument();
  });
});
