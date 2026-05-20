import { vi, describe, it, expect, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));

const mockGetCurrentUser = vi.mocked(getCurrentUser);

const staffUser = {
  id: "user-staff-centro",
  email: "staff@demo.cl",
  name: "Vendedor Sucursal Centro",
  role: "staff" as const,
  storeId: "providencia",
  isDemoSeed: true,
};

const adminUser = {
  id: "user-admin-demo",
  email: "admin@demo.cl",
  name: "Admin Demo",
  role: "admin" as const,
  storeId: null,
  isDemoSeed: true,
};

const customerUser = {
  id: "user-camila-demo",
  email: "camila@demo.cl",
  name: "Camila Rojas",
  role: "customer" as const,
  storeId: null,
  isDemoSeed: true,
};

const getHelper = async () => import("./auth");

describe("requireStaffOrAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  // S-AUTH-1
  it("allows staff — returns the user", async () => {
    mockGetCurrentUser.mockResolvedValue(staffUser);
    const { requireStaffOrAdmin } = await getHelper();
    const result = await requireStaffOrAdmin();
    expect(result).toEqual(staffUser);
    expect(redirect).not.toHaveBeenCalled();
  });

  // S-AUTH-2
  it("allows admin — returns the user", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const { requireStaffOrAdmin } = await getHelper();
    const result = await requireStaffOrAdmin();
    expect(result).toEqual(adminUser);
    expect(redirect).not.toHaveBeenCalled();
  });

  // S-AUTH-3
  it("redirects to / when unauthenticated (null user)", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const { requireStaffOrAdmin } = await getHelper();
    await expect(requireStaffOrAdmin()).rejects.toThrow("REDIRECT:/");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  // S-AUTH-4
  it("redirects to / for customer role", async () => {
    mockGetCurrentUser.mockResolvedValue(customerUser);
    const { requireStaffOrAdmin } = await getHelper();
    await expect(requireStaffOrAdmin()).rejects.toThrow("REDIRECT:/");
    expect(redirect).toHaveBeenCalledWith("/");
  });
});
