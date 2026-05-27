/**
 * Task 6.7 RED — CoberturaSettings component tests.
 * AS-1a: renders communes input, threshold input, slots input.
 * AS-1b: shows validation error for non-positive threshold.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockUpdateCobertura = vi.fn();

vi.mock("@/app/actions/admin/settings", () => ({
  updateCoberturaSettings: (...args: unknown[]) => mockUpdateCobertura(...args),
}));

import { CoberturaSettings } from "../cobertura-settings";

describe("CoberturaSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateCobertura.mockResolvedValue({ ok: true });
  });

  it("renders covered communes, threshold, and dispatch slots fields", () => {
    render(
      <CoberturaSettings
        initialCommunes={["Providencia", "Las Condes"]}
        initialThreshold={20000}
        initialSlots={["manana", "tarde"]}
      />,
    );

    expect(screen.getAllByText(/comunas cubiertas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/umbral de envío gratis/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/horarios de despacho/i).length).toBeGreaterThan(0);
  });

  it("renders current communes in the textarea", () => {
    render(
      <CoberturaSettings
        initialCommunes={["Providencia", "Las Condes"]}
        initialThreshold={20000}
        initialSlots={["manana"]}
      />,
    );

    // The hint text shows "Actuales: Providencia, Las Condes"
    expect(screen.getByText(/Actuales:.*Providencia/i)).toBeInTheDocument();
  });

  it("calls updateCoberturaSettings on save", async () => {
    render(
      <CoberturaSettings
        initialCommunes={["Providencia"]}
        initialThreshold={20000}
        initialSlots={["manana"]}
      />,
    );

    const saveBtn = screen.getByRole("button", { name: /guardar/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateCobertura).toHaveBeenCalled();
    });
  });

  it("shows error when action returns error", async () => {
    mockUpdateCobertura.mockResolvedValue({ ok: false, code: "VALIDATION_ERROR", message: "threshold must be positive" });

    render(
      <CoberturaSettings
        initialCommunes={["Providencia"]}
        initialThreshold={20000}
        initialSlots={["manana"]}
      />,
    );

    const saveBtn = screen.getByRole("button", { name: /guardar/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/VALIDATION_ERROR|threshold/i)).toBeInTheDocument();
    });
  });
});
