import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/admin/stores", () => ({
  loadAdminStoreRows: vi.fn(async () => [
    {
      id: "store-1",
      slug: "sucursal-centro",
      name: "Sucursal Centro",
      commune: "Santiago",
      phone: "+56 2 111 2222",
      servicesCount: 3,
    },
    {
      id: "store-2",
      slug: "sucursal-sur",
      name: "Sucursal Sur",
      commune: "Puente Alto",
      phone: "+56 2 333 4444",
      servicesCount: 0,
    },
  ]),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/app/actions/admin/stores", () => ({
  deleteStore: vi.fn(async () => ({ ok: true })),
}));

import SucursalesPage from "../page";

describe("SucursalesPage", () => {
  it("renders stores with commune + phone + services count (S11)", async () => {
    const jsx = await SucursalesPage();
    render(jsx);

    expect(screen.getByText("Sucursal Centro")).toBeInTheDocument();
    expect(screen.getByText("Santiago")).toBeInTheDocument();
    expect(screen.getByText("+56 2 111 2222")).toBeInTheDocument();
    expect(screen.getByText(/3 servicios/i)).toBeInTheDocument();
  });

  it("renders 'Nueva sucursal' link", async () => {
    const jsx = await SucursalesPage();
    render(jsx);

    const link = screen.getByRole("link", { name: /nueva sucursal/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/admin/sucursales/nueva");
  });
});
