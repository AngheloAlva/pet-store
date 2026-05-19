import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PersonaSelector } from "./persona-selector";

// Mock server actions — they must never execute in tests
vi.mock("@/app/actions/session", () => ({
  switchPersona: vi.fn(async () => ({ ok: true })),
  clearSession: vi.fn(async () => {}),
  createDemoAccount: vi.fn(async () => ({ ok: true })),
}));

const mockUser = {
  id: "user-camila-demo",
  email: "camila@demo.cl",
  name: "Camila Rojas",
  role: "customer" as const,
  storeId: null,
  isDemoSeed: true,
};

describe("PersonaSelector", () => {
  it("anonymous: trigger shows 'Entrar como…' and dropdown lists the 3 seed personas", async () => {
    const user = userEvent.setup();
    render(<PersonaSelector currentUser={null} />);

    // Trigger text is always rendered (hidden on mobile, visible on sm+)
    expect(screen.getByText("Entrar como…")).toBeInTheDocument();

    // Open the dropdown
    await user.click(screen.getByRole("button", { name: /cambiar persona/i }));

    // All 3 seed personas must appear in the open menu
    expect(await screen.findByText("Camila Rojas")).toBeInTheDocument();
    expect(await screen.findByText("Admin Demo")).toBeInTheDocument();
    expect(await screen.findByText("Vendedor Sucursal Centro")).toBeInTheDocument();
  });

  it("authenticated: trigger shows current user name and menu has 'Cerrar sesión' action", async () => {
    const user = userEvent.setup();
    render(<PersonaSelector currentUser={mockUser} />);

    // Trigger shows the logged-in user's name
    expect(screen.getByText("Camila Rojas")).toBeInTheDocument();

    // Open the dropdown
    await user.click(screen.getByRole("button", { name: /menú de usuario/i }));

    // Authenticated menu shows the email as a label and the sign-out action
    expect(await screen.findByText("camila@demo.cl")).toBeInTheDocument();
    expect(await screen.findByText("Cerrar sesión")).toBeInTheDocument();
  });
});
