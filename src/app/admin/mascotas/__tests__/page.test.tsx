import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  useRouter: vi.fn(() => ({ refresh: vi.fn(), push: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(async () => ({
    id: "user-admin-demo",
    email: "admin@demo.cl",
    name: "Admin Demo",
    role: "admin",
    storeId: null,
    isDemoSeed: true,
  })),
}));

vi.mock("@/lib/admin/pets", () => ({
  getAllPets: vi.fn(async () => [
    {
      id: "pet-tobi-camila",
      userId: "user-camila-demo",
      name: "Tobi",
      species: "dog",
      breed: "Golden Retriever",
      birthDate: "2021-03-12",
      weightKg: "28.50",
      active: true,
    },
    {
      id: "pet-luna-admin",
      userId: "user-admin-demo",
      name: "Luna",
      species: "cat",
      breed: null,
      birthDate: null,
      weightKg: null,
      active: false,
    },
  ]),
}));

vi.mock("@/app/actions/admin/pets", () => ({
  createPet: vi.fn(async () => ({ ok: true, id: "new-pet" })),
  updatePet: vi.fn(async () => ({ ok: true })),
  deletePet: vi.fn(async () => ({ ok: true })),
}));

import MascotasAdminPage from "../page";

describe("MascotasAdminPage (/admin/mascotas)", () => {
  it("renders pet list for admin", async () => {
    const jsx = await MascotasAdminPage();
    render(jsx);

    expect(screen.getByText("Tobi")).toBeInTheDocument();
    expect(screen.getByText("Luna")).toBeInTheDocument();
  });

  it("redirects non-admin to / (S-ADMIN-1a)", async () => {
    const { getCurrentUser } = await import("@/lib/session");
    vi.mocked(getCurrentUser).mockResolvedValueOnce({
      id: "user-camila-demo",
      email: "camila@demo.cl",
      name: "Camila Rojas",
      role: "customer",
      storeId: null,
      isDemoSeed: true,
    });

    await expect(MascotasAdminPage()).rejects.toThrow(/REDIRECT:\//);
  });

  it("renders species info", async () => {
    const jsx = await MascotasAdminPage();
    render(jsx);

    const dogElements = screen.getAllByText(/dog|perro/i);
    expect(dogElements.length).toBeGreaterThan(0);
  });
});
