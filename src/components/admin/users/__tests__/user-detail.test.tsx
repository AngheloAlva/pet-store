import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/app/actions/admin/users", () => ({
  updateUserIdentity: vi.fn(async () => ({ ok: true })),
  deleteUser: vi.fn(async () => ({ ok: true })),
}));

import { UserIdentityForm } from "../user-identity-form";
import { deleteUser } from "@/app/actions/admin/users";
import type { ZodFlatError } from "@/app/actions/admin/users.schema";

const mockDeleteUser = vi.mocked(deleteUser);

// A bound action (input: unknown) => Promise<...> — mirrors updateUserIdentity.bind(null, id)
const mockUpdateUser = vi.fn(async (input: unknown): Promise<{ ok: true } | { ok: false; errors: ZodFlatError }> => { void input; return { ok: true }; });

const demoUser = {
  id: "user-demo",
  email: "demo@test.cl",
  name: "Demo User",
  rut: null,
  phone: null,
  role: "customer" as const,
  storeId: null,
  isDemoSeed: true,
};

const normalUser = {
  id: "user-normal",
  email: "normal@test.cl",
  name: "Ana García",
  rut: null,
  phone: null,
  role: "customer" as const,
  storeId: null,
  isDemoSeed: false,
};

const stores = [{ id: "store-1", name: "Sucursal Centro" }];

describe("UserIdentityForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("demo-seed: all fields disabled + banner shown + submit absent (S21)", () => {
    render(
      <UserIdentityForm
        user={demoUser}
        stores={stores}
        action={mockUpdateUser}
        onDeleteSuccess={() => {}}
      />,
    );

    expect(screen.getByText(/usuario demo — no editable/i)).toBeInTheDocument();

    // No submit button in DOM
    expect(screen.queryByRole("button", { name: /guardar/i })).not.toBeInTheDocument();

    // Fields are disabled
    const inputs = screen.getAllByRole("textbox");
    for (const input of inputs) {
      expect(input).toBeDisabled();
    }
  });

  it("demo-seed delete button is disabled with correct title (S22)", () => {
    render(
      <UserIdentityForm
        user={demoUser}
        stores={stores}
        action={mockUpdateUser}
        onDeleteSuccess={() => {}}
      />,
    );

    const deleteBtn = screen.getByRole("button", { name: /eliminar usuario/i });
    expect(deleteBtn).toBeDisabled();
    expect(deleteBtn).toHaveAttribute("title", "No se puede eliminar un usuario demo");
  });

  it("non-demo: form is editable + submit present (S23)", () => {
    render(
      <UserIdentityForm
        user={normalUser}
        stores={stores}
        action={mockUpdateUser}
        onDeleteSuccess={() => {}}
      />,
    );

    expect(screen.queryByText(/usuario demo/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /guardar/i })).toBeInTheDocument();
  });

  it("non-demo: delete opens AlertDialog + calls deleteUser (S24)", async () => {
    const user = userEvent.setup();
    const onDeleteSuccess = vi.fn();

    render(
      <UserIdentityForm
        user={normalUser}
        stores={stores}
        action={mockUpdateUser}
        onDeleteSuccess={onDeleteSuccess}
      />,
    );

    const deleteBtn = screen.getByRole("button", { name: /eliminar usuario/i });
    await user.click(deleteBtn);

    // AlertDialog should open
    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    // Click confirm
    const confirmBtn = screen.getByRole("button", { name: /eliminar$/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteUser).toHaveBeenCalledWith(normalUser.id);
    });
  });

  it("points panel stub copy visible (S26)", () => {
    render(
      <UserIdentityForm
        user={normalUser}
        stores={stores}
        action={mockUpdateUser}
        onDeleteSuccess={() => {}}
      />,
    );

    expect(
      screen.getByText(/historial de puntos disponible en F2\.4/i),
    ).toBeInTheDocument();

    const adjustBtn = screen.getByRole("button", { name: /ajustar puntos/i });
    expect(adjustBtn).toBeDisabled();
  });

  it("pets panel stub copy visible (S27)", () => {
    render(
      <UserIdentityForm
        user={normalUser}
        stores={stores}
        action={mockUpdateUser}
        onDeleteSuccess={() => {}}
      />,
    );

    expect(
      screen.getByText(/mascotas próximamente.*F2\.4/i),
    ).toBeInTheDocument();
  });
});
