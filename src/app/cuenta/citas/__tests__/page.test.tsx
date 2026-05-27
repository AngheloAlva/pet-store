import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { getCurrentUser } from "@/lib/session";


vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));

const now = new Date();
const futureDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // +3 days
const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // -7 days

const upcomingAppt = {
  id: "appt-upcoming",
  userId: "user-camila-demo",
  userName: "Camila Rojas",
  petId: null,
  petNameSnapshot: "Tobi",
  serviceId: "svc-1",
  serviceName: "Baño y corte",
  storeId: "providencia",
  storeName: "Providencia",
  startsAt: futureDate,
  endsAt: new Date(futureDate.getTime() + 60 * 60 * 1000),
  status: "scheduled" as const,
  notes: null,
  cancelReason: null,
};

const pastAppt = {
  ...upcomingAppt,
  id: "appt-past",
  startsAt: pastDate,
  endsAt: new Date(pastDate.getTime() + 60 * 60 * 1000),
  status: "attended" as const,
};

// Appointment for a different user — should NEVER appear (APPT-1 leak test)
const otherUserAppt = {
  ...upcomingAppt,
  id: "appt-other-user",
  userId: "user-other-123",
  serviceName: "Corte especial",
};

// Mock the new scoped action (post-fix call site)
vi.mock("@/app/actions/cuenta/appointments", () => ({
  getOwnAppointmentsWithDb: vi.fn(async (_db: unknown, userId: string) => {
    // Only return appointments for the requested userId (mirrors DB behavior)
    const all = [upcomingAppt, pastAppt, otherUserAppt];
    return all.filter((a) => a.userId === userId);
  }),
}));

vi.mock("@/app/actions/appointments", () => ({
  cancelOwnAppointment: vi.fn(async () => ({ ok: true })),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const mockGetCurrentUser = vi.mocked(getCurrentUser);

const camilaUser = {
  id: "user-camila-demo",
  email: "camila@demo.cl",
  name: "Camila Rojas",
  role: "customer" as const,
  storeId: null,
  isDemoSeed: true,
};

import CitasPage from "../page";

describe("CitasPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects unauthenticated user", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    await expect(CitasPage()).rejects.toThrow(/REDIRECT/);
  });

  it("S-CUENTA-1: renders upcoming cita in Próximas section", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const jsx = await CitasPage();
    render(jsx);
    expect(screen.getByText(/próximas citas/i)).toBeInTheDocument();
    // Service name appears in upcoming section
    const cells = screen.getAllByText("Baño y corte");
    expect(cells.length).toBeGreaterThan(0);
  });

  it("S-CUENTA-2: renders past appointment in Historial section", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const jsx = await CitasPage();
    render(jsx);
    expect(screen.getByText(/historial/i)).toBeInTheDocument();
  });

  it("renders cancel button for upcoming scheduled appointment", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const jsx = await CitasPage();
    render(jsx);
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // APPT-1 leak test: user B appointments must NOT appear when user A is logged in
  // ---------------------------------------------------------------------------
  it("APPT-1: appointments of other users are NOT in query result", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const jsx = await CitasPage();
    render(jsx);

    // The mock filters by userId, so otherUserAppt's service "Corte especial"
    // should never be rendered
    expect(screen.queryByText("Corte especial")).not.toBeInTheDocument();
  });
});
