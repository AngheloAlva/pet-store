import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UsersListClient } from "../users-list-client";
import type { AdminUserRow } from "@/lib/admin/users";

const rows: AdminUserRow[] = [
  {
    id: "u1",
    email: "pedro@test.cl",
    name: "Pedro Alvarado",
    rut: "12.345.678-9",
    phone: null,
    role: "customer",
    storeId: null,
    storeName: null,
    isDemoSeed: false,
    createdAt: "2024-01-01",
  },
  {
    id: "u2",
    email: "ana@test.cl",
    name: "Ana García",
    rut: null,
    phone: null,
    role: "admin",
    storeId: null,
    storeName: null,
    isDemoSeed: true,
    createdAt: "2024-01-02",
  },
  {
    id: "u3",
    email: "juan@test.cl",
    name: "Juan Lopez",
    rut: null,
    phone: null,
    role: "staff",
    storeId: null,
    storeName: null,
    isDemoSeed: false,
    createdAt: "2024-01-03",
  },
];

describe("UsersListClient", () => {
  it("filters case-insensitively by name (S20)", async () => {
    const user = userEvent.setup();
    render(<UsersListClient rows={rows} />);

    const searchInput = screen.getByRole("textbox");
    await user.type(searchInput, "pedro");

    expect(screen.getByText("Pedro Alvarado")).toBeInTheDocument();
    expect(screen.queryByText("Ana García")).not.toBeInTheDocument();
  });

  it("shows all rows when input is cleared", async () => {
    const user = userEvent.setup();
    render(<UsersListClient rows={rows} />);

    const searchInput = screen.getByRole("textbox");
    await user.type(searchInput, "pedro");
    await user.clear(searchInput);

    expect(screen.getByText("Pedro Alvarado")).toBeInTheDocument();
    expect(screen.getByText("Ana García")).toBeInTheDocument();
    expect(screen.getByText("Juan Lopez")).toBeInTheDocument();
  });

  it("shows empty state when no rows match", async () => {
    const user = userEvent.setup();
    render(<UsersListClient rows={rows} />);

    const searchInput = screen.getByRole("textbox");
    await user.type(searchInput, "nonexistent-xyz");

    expect(screen.getByText(/no hay usuarios/i)).toBeInTheDocument();
  });
});
