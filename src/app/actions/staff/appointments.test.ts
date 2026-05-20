import { vi, describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import { revalidatePath } from "next/cache";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/staff/auth", () => ({
  requireStaffOrAdmin: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

const mockRevalidatePath = vi.mocked(revalidatePath);

const staffUser = {
  id: "user-staff-centro",
  email: "staff@demo.cl",
  name: "Vendedor Sucursal Centro",
  role: "staff" as const,
  storeId: "providencia",
  isDemoSeed: true,
};

const getActions = async () => import("./appointments");

describe("markAppointmentAttended", () => {
  let mockRequireStaffOrAdmin: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const staffAuth = await import("@/lib/staff/auth");
    mockRequireStaffOrAdmin = vi.mocked(staffAuth.requireStaffOrAdmin);
    mockRequireStaffOrAdmin.mockResolvedValue(staffUser);

    (db as AnyDb).update = vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => ({})) })),
    }));
  });

  // S-ACTION-4
  it("S-ACTION-4: sets status=attended and revalidates /staff", async () => {
    const { markAppointmentAttended } = await getActions();
    await markAppointmentAttended({ appointmentId: "appt-1" });

    expect((db as AnyDb).update).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/staff");
  });

  it("requireStaffOrAdmin is called once (auth once via helper)", async () => {
    const { markAppointmentAttended } = await getActions();
    await markAppointmentAttended({ appointmentId: "appt-1" });
    expect(mockRequireStaffOrAdmin).toHaveBeenCalledTimes(1);
  });
});

describe("markAppointmentNoShow", () => {
  let mockRequireStaffOrAdmin: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const staffAuth = await import("@/lib/staff/auth");
    mockRequireStaffOrAdmin = vi.mocked(staffAuth.requireStaffOrAdmin);
    mockRequireStaffOrAdmin.mockResolvedValue(staffUser);

    (db as AnyDb).update = vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => ({})) })),
    }));
  });

  // S-ACTION-5
  it("S-ACTION-5: sets status=no_show and revalidates /staff", async () => {
    const { markAppointmentNoShow } = await getActions();
    await markAppointmentNoShow({ appointmentId: "appt-1" });

    expect((db as AnyDb).update).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/staff");
  });
});

describe("staff action auth gate", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const staffAuth = await import("@/lib/staff/auth");
    vi.mocked(staffAuth.requireStaffOrAdmin).mockImplementation(() => {
      throw new Error("REDIRECT:/");
    });
  });

  // S-ACTION-6
  it("S-ACTION-6: customer blocked — throws redirect, DB not called", async () => {
    const { markAppointmentAttended } = await getActions();
    await expect(markAppointmentAttended({ appointmentId: "appt-1" })).rejects.toThrow("REDIRECT:/");
    expect((db as AnyDb).update).not.toHaveBeenCalled();
  });
});
