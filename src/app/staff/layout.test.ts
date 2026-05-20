import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/staff/auth", () => ({
  requireStaffOrAdmin: vi.fn(),
}));
// Mock next/navigation for redirect
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

// Mock child components and dependencies to avoid rendering complexity
vi.mock("@/components/staff/store-picker", () => ({
  StorePicker: () => null,
}));
vi.mock("@/db/sync-cache", () => ({
  getCachedStores: vi.fn(() => [{ id: "providencia", name: "Providencia", slug: "providencia", address: "", commune: "", phone: "", lat: "0", lng: "0", schedule: {}, services: [], reference: null }]),
}));

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

const getLayout = async () => import("./layout");

describe("StaffLayout", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  // S-LAYOUT-3
  it("S-LAYOUT-3: allows staff — requireStaffOrAdmin resolves, no redirect thrown", async () => {
    const staffAuth = await import("@/lib/staff/auth");
    vi.mocked(staffAuth.requireStaffOrAdmin).mockResolvedValue(staffUser);

    const { default: StaffLayout } = await getLayout();
    // If requireStaffOrAdmin resolves without throwing, the layout renders.
    // We verify it doesn't throw.
    await expect(
      StaffLayout({ children: null, searchParams: Promise.resolve({}) }),
    ).resolves.not.toThrow();
  });

  // S-LAYOUT-4
  it("S-LAYOUT-4: allows admin — requireStaffOrAdmin resolves, no redirect thrown", async () => {
    const staffAuth = await import("@/lib/staff/auth");
    vi.mocked(staffAuth.requireStaffOrAdmin).mockResolvedValue(adminUser);

    const { default: StaffLayout } = await getLayout();
    await expect(
      StaffLayout({ children: null, searchParams: Promise.resolve({}) }),
    ).resolves.not.toThrow();
  });

  // S-LAYOUT-1
  it("S-LAYOUT-1: anonymous → requireStaffOrAdmin throws redirect", async () => {
    const staffAuth = await import("@/lib/staff/auth");
    vi.mocked(staffAuth.requireStaffOrAdmin).mockImplementation(() => {
      throw new Error("REDIRECT:/");
    });

    const { default: StaffLayout } = await getLayout();
    await expect(
      StaffLayout({ children: null, searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("REDIRECT:/");
  });

  // S-LAYOUT-2
  it("S-LAYOUT-2: customer → requireStaffOrAdmin throws redirect", async () => {
    const staffAuth = await import("@/lib/staff/auth");
    vi.mocked(staffAuth.requireStaffOrAdmin).mockImplementation(() => {
      throw new Error("REDIRECT:/");
    });

    const { default: StaffLayout } = await getLayout();
    await expect(
      StaffLayout({ children: null, searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("REDIRECT:/");
  });
});
