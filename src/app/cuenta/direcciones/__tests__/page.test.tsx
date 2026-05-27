/**
 * Task 6.1 RED — /cuenta/direcciones page test (ADDR-1)
 * - List renders 2 addresses, default visually marked
 * - Empty state with "Agregar dirección" button
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const mockAddresses = [
  {
    id: "addr-1",
    userId: "user-a",
    label: "Casa",
    name: "Camila Rojas",
    street: "Av. Principal 123",
    commune: "Santiago",
    region: "Región Metropolitana",
    phone: "+56912345678",
    notes: null,
    isDefault: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
  {
    id: "addr-2",
    userId: "user-a",
    label: "Oficina",
    name: "Camila Rojas",
    street: "Calle Comercio 456",
    commune: "Providencia",
    region: "Región Metropolitana",
    phone: "+56912345678",
    notes: null,
    isDefault: false,
    createdAt: new Date("2026-01-02"),
    updatedAt: new Date("2026-01-02"),
  },
];

vi.mock("@/app/actions/cuenta/direcciones", () => ({
  listAddresses: vi.fn(async () => mockAddresses),
  createAddress: vi.fn(),
  updateAddress: vi.fn(),
  deleteAddress: vi.fn(),
  setDefaultAddress: vi.fn(),
}));

import DireccionesPage from "../page";

describe("/cuenta/direcciones page (ADDR-1)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders both addresses (ADDR-1)", async () => {
    const jsx = await DireccionesPage();
    render(jsx);
    expect(screen.getByText("Casa")).toBeInTheDocument();
    expect(screen.getByText("Oficina")).toBeInTheDocument();
  });

  it("marks the default address visually (ADDR-1)", async () => {
    const jsx = await DireccionesPage();
    render(jsx);
    // The default address badge should be visible
    const badges = screen.getAllByText(/predeterminada/i);
    expect(badges.length).toBeGreaterThan(0);
  });

  it("shows empty state with 'Agregar dirección' when no addresses (ADDR-1)", async () => {
    const { listAddresses } = await import("@/app/actions/cuenta/direcciones");
    vi.mocked(listAddresses).mockResolvedValueOnce([]);
    const jsx = await DireccionesPage();
    render(jsx);
    expect(screen.getByText(/agregar dirección/i)).toBeInTheDocument();
  });
});
