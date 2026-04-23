import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import BlogPage, { metadata } from "./page";

describe("blog page", () => {
  it("renders a heading with Blog", () => {
    render(<BlogPage />);
    expect(screen.getByRole("heading", { level: 1, name: /blog/i })).toBeInTheDocument();
  });

  it("exposes a próximamente marker", () => {
    render(<BlogPage />);
    expect(screen.getByText(/próximamente/i)).toBeInTheDocument();
  });

  it("renders at least three teaser items", () => {
    const { container } = render(<BlogPage />);
    const items = container.querySelectorAll("ul > li");
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it("exposes a canonical alternate", () => {
    expect(metadata.alternates?.canonical).toBe("/blog");
  });
});
