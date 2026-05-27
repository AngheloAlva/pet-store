/**
 * Task 4.1 RED — CuentaSidebar component test (HUB-2)
 * - Active route: "Mis Pedidos" has aria-current="page" when on /cuenta/pedidos
 * - Disabled items have aria-disabled="true" and no href
 * - "Próximamente" badge rendered for disabled items
 */
import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/cuenta/pedidos"),
}));

import { CuentaSidebar } from "@/components/cuenta/cuenta-sidebar";

describe("CuentaSidebar (HUB-2)", () => {
  it("renders 'Mis Pedidos' link", () => {
    render(<CuentaSidebar />);
    const link = screen.getAllByRole("link").find((l) =>
      l.textContent?.includes("Mis Pedidos"),
    );
    expect(link).toBeInTheDocument();
  });

  it("'Mis Pedidos' has aria-current='page' when on /cuenta/pedidos", () => {
    render(<CuentaSidebar />);
    const link = screen.getAllByRole("link").find((l) =>
      l.textContent?.includes("Mis Pedidos"),
    );
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("'Resumen' does NOT have aria-current when on /cuenta/pedidos", () => {
    render(<CuentaSidebar />);
    const link = screen.getAllByRole("link").find((l) =>
      l.textContent?.includes("Resumen"),
    );
    expect(link).not.toHaveAttribute("aria-current", "page");
  });

  it("disabled items have aria-disabled='true'", () => {
    render(<CuentaSidebar />);
    const disabledItems = screen
      .getAllByRole("link", { hidden: true })
      .filter((el) => el.getAttribute("aria-disabled") === "true");
    expect(disabledItems.length).toBeGreaterThan(0);
  });

  it("disabled items render 'Próximamente' badge", () => {
    render(<CuentaSidebar />);
    const badges = screen.getAllByText(/próximamente/i);
    expect(badges.length).toBeGreaterThan(0);
  });

  it("active items are navigable links (href present)", () => {
    render(<CuentaSidebar />);
    const pedidosLink = screen
      .getAllByRole("link")
      .find((l) => l.textContent?.includes("Mis Pedidos"));
    expect(pedidosLink).toHaveAttribute("href", "/cuenta/pedidos");
  });

  it("disabled items have no href (not navigable)", () => {
    render(<CuentaSidebar />);
    // Disabled items should not have href pointing to a real page
    // They may have aria-disabled="true" and no href or href="#"
    const disabledItems = document
      .querySelectorAll("[aria-disabled='true']");
    disabledItems.forEach((item) => {
      const href = item.getAttribute("href");
      // Should either have no href or an empty/non-navigable href
      expect(href === null || href === "" || href === "#").toBe(true);
    });
  });
});
