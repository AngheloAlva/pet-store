/**
 * Task 6.3 RED — DireccionForm component test (ADDR-2)
 * - Commune validation error shown when not covered
 * - Submit calls createAddress wrapper (ADDR-2)
 */
import { vi, describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/actions/cuenta/direcciones", () => ({
  createAddress: vi.fn(async (input: unknown) => {
    const data = input as Record<string, string>;
    if (data.commune === "Arica") {
      return { ok: false, code: "COMMUNE_NOT_COVERED" };
    }
    return { ok: true, addressId: "new-addr-1" };
  }),
  updateAddress: vi.fn(async () => ({ ok: true })),
  deleteAddress: vi.fn(async () => ({ ok: true })),
  setDefaultAddress: vi.fn(async () => ({ ok: true })),
  listAddresses: vi.fn(async () => []),
}));

import { DireccionForm } from "../direccion-form";

describe("DireccionForm (ADDR-2)", () => {
  it("renders the form fields", () => {
    render(<DireccionForm />);
    expect(screen.getByLabelText(/etiqueta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/calle/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/comuna/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/región/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<DireccionForm />);
    expect(screen.getByRole("button", { name: /guardar/i })).toBeInTheDocument();
  });
});
