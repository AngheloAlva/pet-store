import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/admin/users", () => ({
  loadAdminUserRows: vi.fn(async () => [
    {
      id: "u1",
      email: "admin@test.cl",
      name: "Admin User",
      rut: "12.345.678-9",
      phone: null,
      role: "admin",
      storeId: null,
      storeName: null,
      isDemoSeed: true,
      createdAt: "2024-01-01",
    },
    {
      id: "u2",
      email: "normal@test.cl",
      name: "Normal User",
      rut: null,
      phone: null,
      role: "customer",
      storeId: null,
      storeName: null,
      isDemoSeed: false,
      createdAt: "2024-01-02",
    },
  ]),
}));

import UsuariosPage from "../page";

describe("UsuariosPage", () => {
  it("renders users table with role badge and isDemoSeed badge (S19)", async () => {
    const jsx = await UsuariosPage();
    render(jsx);

    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("Normal User")).toBeInTheDocument();
    // Role badges
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("customer")).toBeInTheDocument();
    // isDemoSeed badge (at least one Demo badge)
    expect(screen.getAllByText("Demo").length).toBeGreaterThan(0);
  });

  it("renders search input", async () => {
    const jsx = await UsuariosPage();
    render(jsx);

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders Ver link in actions column", async () => {
    const jsx = await UsuariosPage();
    render(jsx);

    const links = screen.getAllByRole("link", { name: /ver/i });
    expect(links.length).toBeGreaterThan(0);
  });
});
