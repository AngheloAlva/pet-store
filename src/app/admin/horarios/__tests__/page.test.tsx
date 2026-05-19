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

vi.mock("@/lib/admin/schedule-configs", () => ({
  loadScheduleConfigs: vi.fn(async () => [
    {
      id: "cfg-1",
      storeId: "providencia",
      serviceId: null,
      weekday: 1,
      startHHMM: 900,
      endHHMM: 1700,
      slotMinutes: 30,
      active: true,
    },
  ]),
  loadBlockedSlots: vi.fn(async () => [
    {
      id: "bs-1",
      storeId: "providencia",
      serviceId: null,
      startsAt: new Date("2026-06-01T00:00:00.000Z"),
      endsAt: new Date("2026-06-02T00:00:00.000Z"),
      reason: "Feriado",
    },
  ]),
}));

vi.mock("@/app/actions/admin/schedule-configs", () => ({
  createScheduleConfig: vi.fn(async () => ({ ok: true, id: "new-cfg" })),
  deleteScheduleConfig: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/app/actions/admin/blocked-slots", () => ({
  createBlockedSlot: vi.fn(async () => ({ ok: true, id: "new-bs" })),
  deleteBlockedSlot: vi.fn(async () => ({ ok: true })),
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

import HorariosPage from "../page";

describe("HorariosPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("S-ADMIN-2: renders schedule config list", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const jsx = await HorariosPage();
    render(jsx);
    expect(screen.getByText("Horarios")).toBeInTheDocument();
  });

  it("S-ADMIN-3: renders blocked slots section", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const jsx = await HorariosPage();
    render(jsx);
    expect(screen.getByText(/bloqueados/i)).toBeInTheDocument();
  });
});
