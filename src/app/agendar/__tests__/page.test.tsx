import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));

vi.mock("@/lib/admin/services", () => ({
  loadAllServices: vi.fn(async () => [
    {
      id: "bath-trim",
      slug: "bath-trim",
      name: "Baño y corte",
      description: "Servicio de baño",
      durationMin: 60,
      priceCents: 15000,
      requiresPet: false,
      species: ["dog"],
      active: true,
    },
  ]),
}));

vi.mock("@/db/loaders", () => ({
  loadAllStores: vi.fn(async () => [
    {
      id: "providencia",
      slug: "providencia",
      name: "Providencia",
      address: "Av. Providencia 2133",
      commune: "Providencia",
      phone: "+56 2 2345 6789",
      coordinates: { lat: -33.4251, lng: -70.6109 },
      schedule: {},
      services: ["grooming"],
      reference: null,
    },
  ]),
}));

vi.mock("@/app/actions/appointments", () => ({
  createAppointment: vi.fn(async () => ({ ok: true, id: "appt-new" })),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockRedirect = vi.mocked(redirect);

const camilaUser = {
  id: "user-camila-demo",
  email: "camila@demo.cl",
  name: "Camila Rojas",
  role: "customer" as const,
  storeId: null,
  isDemoSeed: true,
};

import AgendarPage from "../page";

describe("AgendarPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects unauthenticated user to login", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    await expect(
      AgendarPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow(/REDIRECT/);
    expect(mockRedirect).toHaveBeenCalled();
  });

  it("S-PUBLIC-1: renders service selection step when no params", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const jsx = await AgendarPage({ searchParams: Promise.resolve({}) });
    render(jsx);
    expect(screen.getByText(/agendar/i)).toBeInTheDocument();
    // Should show service step
    expect(screen.getByText(/elige un servicio/i)).toBeInTheDocument();
  });

  it("S-PUBLIC-4: URL param pre-selects service step — shows store selection", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const jsx = await AgendarPage({
      searchParams: Promise.resolve({ service: "bath-trim" }),
    });
    render(jsx);
    // With service param present, should show store step
    expect(screen.getByText(/elige una sucursal/i)).toBeInTheDocument();
  });

  it("S-PUBLIC-4: Both service+store pre-selected — shows date/slot step", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const jsx = await AgendarPage({
      searchParams: Promise.resolve({ service: "bath-trim", store: "providencia" }),
    });
    render(jsx);
    expect(screen.getByText(/elige una fecha/i)).toBeInTheDocument();
  });

  it("S-PUBLIC-2: confirmation step shown when all params present", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const jsx = await AgendarPage({
      searchParams: Promise.resolve({
        service: "bath-trim",
        store: "providencia",
        date: "2026-06-10",
        slot: "2026-06-10T10:00:00.000Z",
      }),
    });
    render(jsx);
    expect(screen.getAllByText(/confirmar/i).length).toBeGreaterThan(0);
  });
});
