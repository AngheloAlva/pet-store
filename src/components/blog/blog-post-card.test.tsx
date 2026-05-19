import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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

import { BlogPostCard } from "./blog-post-card";

const makePost = (overrides: Record<string, unknown> = {}) => ({
  id: "post-1",
  slug: "cuidados-perros",
  title: "Cuidados esenciales para perros",
  excerpt: "Todo lo que necesitas saber para cuidar a tu perro feliz.",
  bodyMarkdown: "# Body",
  heroImageUrl: "https://example.com/hero.jpg",
  category: "cuidados",
  species: ["dog"],
  tags: [],
  authorName: "Dr. Martínez",
  status: "published",
  publishedAt: new Date("2026-05-01T10:00:00Z"),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("BlogPostCard (8.1)", () => {
  it("renders the post title", () => {
    render(<BlogPostCard post={makePost()} />);
    expect(screen.getByText("Cuidados esenciales para perros")).toBeInTheDocument();
  });

  it("renders the excerpt", () => {
    render(<BlogPostCard post={makePost()} />);
    expect(screen.getByText(/Todo lo que necesitas saber/)).toBeInTheDocument();
  });

  it("renders the category badge", () => {
    render(<BlogPostCard post={makePost()} />);
    const badge = screen.getByText("Cuidados");
    expect(badge).toBeInTheDocument();
  });

  it("renders a link to /blog/[slug]", () => {
    render(<BlogPostCard post={makePost()} />);
    const links = screen.getAllByRole("link");
    expect(links.some((l) => l.getAttribute("href") === "/blog/cuidados-perros")).toBe(true);
  });

  it("shows hero image when heroImageUrl is provided", () => {
    render(<BlogPostCard post={makePost()} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/hero.jpg");
  });

  it("shows a fallback placeholder when heroImageUrl is null", () => {
    render(<BlogPostCard post={makePost({ heroImageUrl: null })} />);
    // Should not crash and should render title
    expect(screen.getByText("Cuidados esenciales para perros")).toBeInTheDocument();
  });
});
