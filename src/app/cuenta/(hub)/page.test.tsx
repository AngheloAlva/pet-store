import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/app/actions/cuenta/pedidos", () => ({
  getOwnOrders: vi.fn(async () => []),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { getCurrentUser } from "@/lib/session";
import CuentaPage, { metadata } from "./page";

const mockGetCurrentUser = vi.mocked(getCurrentUser);

const camilaUser = {
  id: "user-camila-demo",
  email: "camila@demo.cl",
  name: "Camila Rojas",
  role: "customer" as const,
  storeId: null,
  isDemoSeed: true,
};

describe("cuenta page (hub)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a heading with Mi cuenta", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const jsx = await CuentaPage();
    render(jsx);
    expect(
      screen.getByRole("heading", { level: 1, name: /mi cuenta/i }),
    ).toBeInTheDocument();
  });

  it("renders sections for pedidos, puntos, and citas (HUB-3)", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const jsx = await CuentaPage();
    render(jsx);
    const body = document.body.textContent?.toLowerCase() ?? "";
    expect(body).toContain("pedidos");
    expect(body).toContain("puntos");
    expect(body).toContain("citas");
  });

  it("each section links to its subsection (HUB-3)", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const jsx = await CuentaPage();
    render(jsx);
    expect(screen.getByRole("link", { name: /ver todos/i })).toHaveAttribute(
      "href",
      "/cuenta/pedidos",
    );
    expect(screen.getByRole("link", { name: /ver detalle/i })).toHaveAttribute(
      "href",
      "/cuenta/puntos",
    );
  });

  it("shows empty state CTA for pedidos when no orders (HUB-3)", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const jsx = await CuentaPage();
    render(jsx);
    expect(screen.getByRole("link", { name: /explorá el catálogo/i })).toHaveAttribute(
      "href",
      "/catalogo",
    );
  });

  it("exposes a canonical alternate", () => {
    expect(metadata.alternates?.canonical).toBe("/cuenta");
  });
});
