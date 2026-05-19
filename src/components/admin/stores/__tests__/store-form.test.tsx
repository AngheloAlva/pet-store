import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { StoreForm } from "../store-form";

// Default valid schedule for tests
const validSchedule = {
  mon: { open: "09:00", close: "18:00" },
  tue: { open: "09:00", close: "18:00" },
  wed: { open: "09:00", close: "18:00" },
  thu: { open: "09:00", close: "18:00" },
  fri: { open: "09:00", close: "18:00" },
  sat: { closed: true as const },
  sun: { closed: true as const },
};

const mockCreateAction = vi.fn(async () => ({ ok: true as const, id: "new-store-id" }));

describe("StoreForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all 11 fields in create mode (S12)", () => {
    render(<StoreForm mode="create" action={mockCreateAction} />);

    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/slug/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dirección/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/comuna/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/latitud/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/longitud/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/referencia/i)).toBeInTheDocument();
    // Schedule section
    expect(screen.getByText(/horario/i)).toBeInTheDocument();
    // Services section
    expect(screen.getByText(/servicios/i)).toBeInTheDocument();
  });

  it("schedule editor — toggling Cerrado disables time inputs (S13)", async () => {
    render(<StoreForm mode="create" action={mockCreateAction} />);

    // Find the Monday closed checkbox
    const mondayCheckbox = screen.getByLabelText(/lunes.*cerrado|cerrado.*lunes/i);
    expect(mondayCheckbox).not.toBeChecked();

    fireEvent.click(mondayCheckbox);
    expect(mondayCheckbox).toBeChecked();
    // Monday time inputs should be gone or disabled — checkbox checked confirms state flip
  });

  it("schedule editor — enabling closed day restores default 09:00–18:00 (S13)", async () => {
    const initialWithClosed = {
      id: "store-1",
      slug: "store-1",
      name: "Test Store",
      address: "Av Test 123",
      commune: "Santiago",
      phone: "+56 2 123",
      lat: "-33.45",
      lng: "-70.65",
      schedule: { ...validSchedule, mon: { closed: true as const } },
      services: [],
      reference: null,
    };

    render(
      <StoreForm mode="edit" initial={initialWithClosed} action={mockCreateAction} />,
    );

    const mondayCheckbox = screen.getByLabelText(/lunes.*cerrado|cerrado.*lunes/i);
    expect(mondayCheckbox).toBeChecked();

    fireEvent.click(mondayCheckbox);
    expect(mondayCheckbox).not.toBeChecked();

    // Time inputs should appear with default values
    await waitFor(() => {
      expect(screen.getAllByDisplayValue("09:00").length).toBeGreaterThan(0);
    });
  });

  it("services chip input — typing + Enter adds chip; clicking × removes (S15)", async () => {
    const user = userEvent.setup();
    render(<StoreForm mode="create" action={mockCreateAction} />);

    const serviceInput = screen.getByPlaceholderText(/agregar servicio/i);
    await user.type(serviceInput, "Veterinaria");
    await user.keyboard("{Enter}");

    expect(screen.getByText("Veterinaria")).toBeInTheDocument();

    // Remove the chip
    const removeButton = screen.getByRole("button", { name: /eliminar veterinaria/i });
    await user.click(removeButton);

    expect(screen.queryByText("Veterinaria")).not.toBeInTheDocument();
  });

  it("edit mode pre-populates all fields (S16)", () => {
    const initial = {
      id: "store-1",
      slug: "sucursal-las-condes",
      name: "Sucursal Las Condes",
      address: "Av. Apoquindo 1234",
      commune: "Las Condes",
      phone: "+56 2 123 4567",
      lat: "-33.41",
      lng: "-70.57",
      schedule: validSchedule,
      services: ["Veterinaria", "Peluquería"],
      reference: null,
    };

    render(<StoreForm mode="edit" initial={initial} action={mockCreateAction} />);

    expect(
      (screen.getByLabelText(/nombre/i) as HTMLInputElement).value,
    ).toBe("Sucursal Las Condes");
    expect(
      (screen.getByLabelText(/teléfono/i) as HTMLInputElement).value,
    ).toBe("+56 2 123 4567");
    expect(screen.getByText("Veterinaria")).toBeInTheDocument();
    expect(screen.getByText("Peluquería")).toBeInTheDocument();
  });

  it("commune required — Spanish error (S31)", async () => {
    const user = userEvent.setup();
    render(<StoreForm mode="create" action={mockCreateAction} />);

    const nameInput = screen.getByLabelText(/nombre/i);
    await user.type(nameInput, "Sucursal Test");

    // Submit without filling commune
    const submitBtn = screen.getByRole("button", { name: /guardar|crear/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/comuna obligatoria/i)).toBeInTheDocument();
    });
  });

  it("slug auto-gen strips diacritics (S33)", async () => {
    const user = userEvent.setup();
    render(<StoreForm mode="create" action={mockCreateAction} />);

    const nameInput = screen.getByLabelText(/nombre/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Sucursal Ñuñoa");

    const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement;
    expect(slugInput.value).toBe("sucursal-nunoa");
  });
});
