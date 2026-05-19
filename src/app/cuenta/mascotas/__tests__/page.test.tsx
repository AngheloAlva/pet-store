import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  useRouter: vi.fn(() => ({ refresh: vi.fn(), push: vi.fn() })),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(async () => ({
    id: "user-camila-demo",
    email: "camila@demo.cl",
    name: "Camila Rojas",
    role: "customer",
    storeId: null,
    isDemoSeed: true,
  })),
}));

vi.mock("@/lib/pets", () => ({
  getOwnPets: vi.fn(async () => [
    {
      id: "pet-tobi-camila",
      userId: "user-camila-demo",
      name: "Tobi",
      species: "dog",
      breed: "Golden Retriever",
      birthDate: "2021-03-12",
      weightKg: "28.50",
      notes: null,
      photoUrl: null,
      active: true,
    },
  ]),
}));

vi.mock("@/app/actions/pets", () => ({
  createPet: vi.fn(async () => ({ ok: true, id: "new-pet" })),
  updatePet: vi.fn(async () => ({ ok: true })),
  deletePet: vi.fn(async () => ({ ok: true })),
}));

import MascotasPage from "../page";

describe("MascotasPage (/cuenta/mascotas)", () => {
  it("renders Tobi card for Camila (S-PUBLIC-2)", async () => {
    const jsx = await MascotasPage();
    render(jsx);

    expect(screen.getByText("Tobi")).toBeInTheDocument();
  });

  it("shows pet species/breed info", async () => {
    const jsx = await MascotasPage();
    render(jsx);

    expect(screen.getByText(/golden retriever/i)).toBeInTheDocument();
  });

  it("renders 'Agregar mascota' button or add CTA", async () => {
    const jsx = await MascotasPage();
    render(jsx);

    // Finds any button containing "mascota" or the add pet trigger
    const buttons = screen.getAllByRole("button");
    const hasMascotaButton = buttons.some((b) =>
      b.textContent?.toLowerCase().includes("mascota"),
    );
    expect(hasMascotaButton).toBe(true);
  });

  it("redirects when user is not authenticated", async () => {
    const { getCurrentUser } = await import("@/lib/session");
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    await expect(MascotasPage()).rejects.toThrow(/REDIRECT/);
  });
});
