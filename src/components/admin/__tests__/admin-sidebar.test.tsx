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

  it("no placeholder links — all 3 new routes are live (S28)", () => {
    render(<AdminSidebar />);
    const placeholderLinks = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href") === "#");
    expect(placeholderLinks).toHaveLength(0);
  });

  it("Categorías link has href='/admin/categorias' (S28)", () => {
    render(<AdminSidebar />);
    const link = screen
      .getAllByRole("link")
      .find((el) => el.textContent?.includes("Categorías"));
    expect(link).toHaveAttribute("href", "/admin/categorias");
    expect(link).not.toHaveAttribute("aria-disabled");
  });

  it("Sucursales link has href='/admin/sucursales' (S28)", () => {
    render(<AdminSidebar />);
    const link = screen
      .getAllByRole("link")
      .find((el) => el.textContent?.includes("Sucursales"));
    expect(link).toHaveAttribute("href", "/admin/sucursales");
    expect(link).not.toHaveAttribute("aria-disabled");
  });

  it("Usuarios link has href='/admin/usuarios' (S28)", () => {
    render(<AdminSidebar />);
    const link = screen
      .getAllByRole("link")
      .find((el) => el.textContent?.includes("Usuarios"));
    expect(link).toHaveAttribute("href", "/admin/usuarios");
    expect(link).not.toHaveAttribute("aria-disabled");
  });

  it("Blog link has href='/admin/blog' (12.1)", () => {
    render(<AdminSidebar />);
    const link = screen
      .getAllByRole("link")
      .find((el) => el.textContent?.includes("Blog"));
    expect(link).toHaveAttribute("href", "/admin/blog");
    expect(link).not.toHaveAttribute("aria-disabled");
  });

  it("Blog link appears between Puntos and Usuarios (12.1)", () => {
    render(<AdminSidebar />);
    const links = screen.getAllByRole("link");
    const labels = links.map((l) => l.textContent?.trim() ?? "");
    const blogIdx = labels.findIndex((l) => l.includes("Blog"));
    const puntosIdx = labels.findIndex((l) => l.includes("Puntos"));
    const usuariosIdx = labels.findIndex((l) => l.includes("Usuarios"));
    expect(blogIdx).toBeGreaterThan(puntosIdx);
    expect(blogIdx).toBeLessThan(usuariosIdx);
  });
});
