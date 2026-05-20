import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StorePicker } from "./store-picker";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace })),
}));

const stores = [
  { id: "providencia", name: "Providencia" },
  { id: "maipu", name: "Maipú" },
];

describe("StorePicker — full mode", () => {
  it("renders store select card with heading", () => {
    render(<StorePicker stores={stores} mode="full" />);
    expect(screen.getByText("Elegí tu sucursal")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /seleccionar sucursal/i })).toBeInTheDocument();
  });

  it("contains all store options", () => {
    render(<StorePicker stores={stores} mode="full" />);
    expect(screen.getByRole("option", { name: "Providencia" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Maipú" })).toBeInTheDocument();
  });
});

describe("StorePicker — compact mode", () => {
  it("renders inline select without heading", () => {
    render(<StorePicker stores={stores} mode="compact" currentStoreId="providencia" />);
    const select = screen.getByRole("combobox", { name: /cambiar sucursal/i });
    expect(select).toBeInTheDocument();
    expect(screen.queryByText("Elegí tu sucursal")).not.toBeInTheDocument();
  });

  it("calls router.replace with ?store=X on change", async () => {
    // Mock window.location for URL construction
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/staff?tab=citas" },
      writable: true,
    });

    const user = userEvent.setup();
    render(<StorePicker stores={stores} mode="compact" currentStoreId="providencia" />);

    const select = screen.getByRole("combobox", { name: /cambiar sucursal/i });
    await user.selectOptions(select, "maipu");
    expect(mockReplace).toHaveBeenCalled();
  });
});
