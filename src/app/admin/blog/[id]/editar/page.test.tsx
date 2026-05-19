import { vi, describe, it, expect } from "vitest";

vi.mock("@/lib/admin/blog", () => ({
  getPostById: vi.fn(async () => null),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/app/actions/admin/blog", () => ({
  createBlogPost: vi.fn(async () => ({ ok: true })),
  updateBlogPost: vi.fn(async () => ({ ok: true })),
  publishBlogPost: vi.fn(async () => ({ ok: true })),
  unpublishBlogPost: vi.fn(async () => ({ ok: true })),
  archiveBlogPost: vi.fn(async () => ({ ok: true })),
}));

import { render, screen } from "@testing-library/react";
import { getPostById } from "@/lib/admin/blog";
import { notFound } from "next/navigation";

const mockGetPostById = vi.mocked(getPostById);
const mockNotFound = vi.mocked(notFound);

const makePost = (overrides: Record<string, unknown> = {}) => ({
  id: "post-abc",
  slug: "articulo-test",
  title: "Artículo de test",
  excerpt: "Extracto de test.",
  bodyMarkdown: "# Test\n\nContenido.",
  heroImageUrl: null,
  category: "cuidados",
  species: ["dog"],
  tags: ["test"],
  authorName: "Dr. Test",
  status: "draft",
  publishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  relatedProductIds: [],
  ...overrides,
});

type EditarPageModule = {
  default: (props: { params: Promise<{ id: string }> }) => Promise<React.ReactElement>;
};

describe("Admin /admin/blog/[id]/editar page (11.5)", () => {
  it("S-ADMIN-3: BlogPostForm is pre-filled with existing post data", async () => {
    const post = makePost({ title: "Mi artículo editado" });
    mockGetPostById.mockResolvedValueOnce(post);

    const { default: EditarPage } = (await import("./page")) as EditarPageModule;
    render(await EditarPage({ params: Promise.resolve({ id: "post-abc" }) }));

    // Title input should have the post title
    const titleInput = screen.getByLabelText(/título/i) as HTMLInputElement;
    expect(titleInput.value).toBe("Mi artículo editado");
  });

  it("calls notFound when post does not exist", async () => {
    mockGetPostById.mockResolvedValueOnce(null);

    const { default: EditarPage } = (await import("./page")) as EditarPageModule;
    await expect(
      EditarPage({ params: Promise.resolve({ id: "nonexistent" }) }),
    ).rejects.toThrow("NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("shows Publicar button when post is draft", async () => {
    const post = makePost({ status: "draft" });
    mockGetPostById.mockResolvedValueOnce(post);

    const { default: EditarPage } = (await import("./page")) as EditarPageModule;
    render(await EditarPage({ params: Promise.resolve({ id: "post-abc" }) }));

    expect(screen.getByText("Publicar")).toBeInTheDocument();
  });

  it("shows Despublicar button when post is published", async () => {
    const post = makePost({ status: "published", publishedAt: new Date() });
    mockGetPostById.mockResolvedValueOnce(post);

    const { default: EditarPage } = (await import("./page")) as EditarPageModule;
    render(await EditarPage({ params: Promise.resolve({ id: "post-abc" }) }));

    expect(screen.getByText("Despublicar")).toBeInTheDocument();
  });
});
