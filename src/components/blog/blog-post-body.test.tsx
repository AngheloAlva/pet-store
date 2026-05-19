import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BlogPostBody } from "./blog-post-body";

describe("BlogPostBody (7.1)", () => {
  it("renders h1 from markdown", () => {
    render(<BlogPostBody markdown="# Título del artículo" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Título del artículo");
  });

  it("renders ul and li from markdown", () => {
    render(<BlogPostBody markdown={"- Item uno\n- Item dos\n- Item tres"} />);
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it("external links get target=_blank and rel=noopener noreferrer", () => {
    render(
      <BlogPostBody markdown="[Visitar sitio](https://example.com)" />,
    );
    const link = screen.getByRole("link", { name: "Visitar sitio" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("internal links do NOT get target=_blank", () => {
    render(
      <BlogPostBody markdown="[Ver catálogo](/catalogo)" />,
    );
    const link = screen.getByRole("link", { name: "Ver catálogo" });
    expect(link).not.toHaveAttribute("target", "_blank");
  });
});
