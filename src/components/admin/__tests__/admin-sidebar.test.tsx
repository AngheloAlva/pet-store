import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AdminSidebar — Productos link (S22/R17)", () => {
  it("Productos link has href='/admin/productos'", () => {
    render(<AdminSidebar />);
    const productosLink = screen
      .getAllByRole("link")
      .find((link) => link.textContent?.includes("Productos"));

    expect(productosLink).toBeInTheDocument();
    expect(productosLink).toHaveAttribute("href", "/admin/productos");
  });

  it("Productos link has no aria-disabled attribute", () => {
    render(<AdminSidebar />);
    const productosLink = screen
      .getAllByRole("link")
      .find((link) => link.textContent?.includes("Productos"));

    expect(productosLink).not.toHaveAttribute("aria-disabled");
  });

  it("Productos link has no tabIndex={-1}", () => {
    render(<AdminSidebar />);
    const productosLink = screen
      .getAllByRole("link")
      .find((link) => link.textContent?.includes("Productos"));

    expect(productosLink).not.toHaveAttribute("tabIndex", "-1");
    expect(productosLink?.getAttribute("tabindex")).not.toBe("-1");
  });

  it("Productos link is keyboard-focusable (no pointer-events-none)", () => {
    render(<AdminSidebar />);
    const productosLink = screen
      .getAllByRole("link")
      .find((link) => link.textContent?.includes("Productos"));

    // Should not have disabled styling class
    expect(productosLink?.className).not.toContain("pointer-events-none");
    expect(productosLink?.className).not.toContain("cursor-not-allowed");
  });

  it("still renders exactly 3 placeholder links with href=#", () => {
    render(<AdminSidebar />);
    const placeholderLinks = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href") === "#");
    expect(placeholderLinks).toHaveLength(3);
  });
});
