import { vi, describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
}));

vi.mock("@/app/actions/admin/blog", () => ({
  createBlogPost: vi.fn(async () => ({ ok: true, id: "new-post-id" })),
  updateBlogPost: vi.fn(async () => ({ ok: true })),
}));

import { BlogPostForm } from "./blog-post-form";

const defaultProps = {
  mode: "create" as const,
  products: [] as { id: string; name: string; category: string }[],
};

describe("BlogPostForm (10.1)", () => {
  it("renders in create mode with title and slug fields", () => {
    render(<BlogPostForm {...defaultProps} />);
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/slug/i)).toBeInTheDocument();
  });

  it("slug auto-fills from title when slug is empty", async () => {
    const user = userEvent.setup();
    render(<BlogPostForm {...defaultProps} />);

    const titleInput = screen.getByLabelText(/título/i);
    await user.type(titleInput, "Cuidados para perros");

    await waitFor(() => {
      const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement;
      expect(slugInput.value).toBe("cuidados-para-perros");
    });
  });

  it("slug does NOT auto-fill once user has manually edited the slug field", async () => {
    const user = userEvent.setup();
    render(<BlogPostForm {...defaultProps} />);

    const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement;
    await user.type(slugInput, "mi-slug-manual");

    const titleInput = screen.getByLabelText(/título/i);
    await user.type(titleInput, "Título nuevo");

    await waitFor(() => {
      expect((screen.getByLabelText(/slug/i) as HTMLInputElement).value).toBe("mi-slug-manual");
    });
  });

  it("renders category select with Spanish labels", () => {
    render(<BlogPostForm {...defaultProps} />);
    expect(screen.getByLabelText(/categoría/i)).toBeInTheDocument();
    expect(screen.getByText("Cuidados")).toBeInTheDocument();
  });

  it("renders species checkboxes", () => {
    render(<BlogPostForm {...defaultProps} />);
    expect(screen.getByLabelText(/perros/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gatos/i)).toBeInTheDocument();
  });
});
