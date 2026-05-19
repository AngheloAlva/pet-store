import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));

vi.mock("@/lib/admin/services", () => ({
  loadAllServices: vi.fn(async () => [
    {
      id: "svc-1",
      slug: "bath-trim",
      name: "Baño y corte",
      description: "Baño profesional",
      durationMin: 60,
      priceCents: 15000,
      requiresPet: true,
      species: ["dog"],
      active: true,
    },
  ]),
}));

vi.mock("@/app/actions/admin/services", () => ({
  createService: vi.fn(async () => ({ ok: true, id: "new-id" })),
  updateService: vi.fn(async () => ({ ok: true })),
  deleteService: vi.fn(async () => ({ ok: true })),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockRedirect = vi.mocked(redirect);

const adminUser = {
  id: "user-admin-demo",
  email: "admin@test.cl",
  name: "Admin",
  role: "admin" as const,
  storeId: null,
  isDemoSeed: false,
};

const customerUser = { ...adminUser, role: "customer" as const };

import ServiciosPage from "../page";

// ---------------------------------------------------------------------------
// S-ADMIN-1: form renders with admin user
// ---------------------------------------------------------------------------
describe("ServiciosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("S-ADMIN-1: renders services list with admin user", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const jsx = await ServiciosPage();
    render(jsx);
    expect(screen.getByText("Servicios")).toBeInTheDocument();
    expect(screen.getByText("Baño y corte")).toBeInTheDocument();
  });

  it("S-ADMIN-6: non-admin is redirected", async () => {
    mockGetCurrentUser.mockResolvedValue(customerUser);
    await expect(ServiciosPage()).rejects.toThrow(/REDIRECT:\//);
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("renders 'Agregar servicio' button", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const jsx = await ServiciosPage();
    render(jsx);
    expect(screen.getByRole("button", { name: /agregar servicio/i })).toBeInTheDocument();
  });
});
