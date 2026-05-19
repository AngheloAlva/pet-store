import { vi, describe, it, expect } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
}));

vi.mock("@/app/actions/admin/blog", () => ({
  createBlogPost: vi.fn(async () => ({ ok: true, id: "new-post" })),
  updateBlogPost: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/db/loaders", () => ({
  loadAllProducts: vi.fn(async () => []),
}));

import { render, screen } from "@testing-library/react";

type NuevoPageModule = {
  default: () => Promise<React.ReactElement>;
};

describe("Admin /admin/blog/nuevo page (11.3)", () => {
  it("S-ADMIN-2: renders BlogPostForm in create mode", async () => {
    const { default: NuevoPage } = (await import("./page")) as NuevoPageModule;
    render(await NuevoPage());

    // Should have title field
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument();
    // Should have slug field
    expect(screen.getByLabelText(/slug/i)).toBeInTheDocument();
    // Should have "Guardar como borrador" button
    expect(screen.getByText("Guardar como borrador")).toBeInTheDocument();
  });
});
