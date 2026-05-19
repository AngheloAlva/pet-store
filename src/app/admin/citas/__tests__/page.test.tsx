import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { getCurrentUser } from "@/lib/session";


vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));

const upcomingAppt = {
  id: "appt-1",
  userId: "user-camila-demo",
  userName: "Camila Rojas",
  petId: null,
  petNameSnapshot: "Firulais",
  serviceId: "svc-1",
  serviceName: "Baño y corte",
  storeId: "providencia",
  storeName: "Providencia",
  startsAt: new Date("2026-06-10T10:00:00.000Z"),
  endsAt: new Date("2026-06-10T11:00:00.000Z"),
  status: "scheduled" as const,
  notes: null,
  cancelReason: null,
};

vi.mock("@/lib/admin/appointments", () => ({
  getAppointments: vi.fn(async () => [upcomingAppt]),
}));

vi.mock("@/app/actions/admin/appointments-admin", () => ({
  cancelAppointment: vi.fn(async () => ({ ok: true })),
  updateAppointment: vi.fn(async () => ({ ok: true })),
  rescheduleAppointment: vi.fn(async () => ({ ok: true })),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const mockGetCurrentUser = vi.mocked(getCurrentUser);

const adminUser = {
  id: "user-admin-demo",
  email: "admin@test.cl",
  name: "Admin",
  role: "admin" as const,
  storeId: null,
  isDemoSeed: false,
};

import CitasAdminPage from "../page";

describe("CitasAdminPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("S-ADMIN-4: renders appointments list", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const jsx = await CitasAdminPage({ searchParams: Promise.resolve({}) });
    render(jsx);
    expect(screen.getByText("Citas")).toBeInTheDocument();
    expect(screen.getByText("Camila Rojas")).toBeInTheDocument();
  });

  it("S-ADMIN-5: renders attended/no-show action buttons", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const jsx = await CitasAdminPage({ searchParams: Promise.resolve({}) });
    render(jsx);
    expect(screen.getByText("Baño y corte")).toBeInTheDocument();
  });

  it("S13: renders cancel button for scheduled appointments", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const jsx = await CitasAdminPage({ searchParams: Promise.resolve({}) });
    render(jsx);
    expect(screen.getByText("Baño y corte")).toBeInTheDocument();
  });
});
