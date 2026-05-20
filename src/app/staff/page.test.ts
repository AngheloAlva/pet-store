import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/staff/auth", () => ({
  requireStaffOrAdmin: vi.fn(),
}));
vi.mock("@/lib/staff/stock", () => ({
  searchProductsWithStock: vi.fn(async () => []),
}));
vi.mock("@/lib/staff/customers", () => ({
  searchCustomers: vi.fn(async () => []),
}));
vi.mock("@/lib/staff/appointments", () => ({
  listTodayAppointments: vi.fn(async () => []),
}));
vi.mock("@/db/sync-cache", () => ({
  getCachedStores: vi.fn(() => [{ id: "providencia", name: "Providencia" }]),
}));
vi.mock("@/components/staff/section-tabs", () => ({
  SectionTabs: () => null,
}));
vi.mock("@/components/staff/stock-panel", () => ({
  StockPanel: () => null,
}));
vi.mock("@/components/staff/customers-panel", () => ({
  CustomersPanel: () => null,
}));
vi.mock("@/components/staff/appointments-panel", () => ({
  AppointmentsPanel: () => null,
}));
vi.mock("@/components/staff/orders-placeholder", () => ({
  OrdersPlaceholder: () => null,
}));
vi.mock("@/components/staff/store-picker", () => ({
  StorePicker: () => null,
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

const getPage = async () => import("./page");

describe("StaffPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // S-PAGE-1: admin with no ?store → StorePicker only, no loaders
  it("S-PAGE-1: admin without ?store renders store picker, loaders NOT called", async () => {
    const staffAuth = await import("@/lib/staff/auth");
    vi.mocked(staffAuth.requireStaffOrAdmin).mockResolvedValue(adminUser);

    const stockLoader = await import("@/lib/staff/stock");
    const apptLoader = await import("@/lib/staff/appointments");
    const customersLoader = await import("@/lib/staff/customers");

    const { default: StaffPage } = await getPage();
    await StaffPage({ searchParams: Promise.resolve({}) });

    expect(vi.mocked(stockLoader.searchProductsWithStock)).not.toHaveBeenCalled();
    expect(vi.mocked(apptLoader.listTodayAppointments)).not.toHaveBeenCalled();
    expect(vi.mocked(customersLoader.searchCustomers)).not.toHaveBeenCalled();
  });

  // S-PAGE-2: staff with no ?store uses user.storeId
  it("S-PAGE-2: staff with no ?store defaults to user.storeId for appointments", async () => {
    const staffAuth = await import("@/lib/staff/auth");
    vi.mocked(staffAuth.requireStaffOrAdmin).mockResolvedValue(staffUser);

    const apptLoader = await import("@/lib/staff/appointments");

    const { default: StaffPage } = await getPage();
    await StaffPage({ searchParams: Promise.resolve({}) });

    expect(vi.mocked(apptLoader.listTodayAppointments)).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "providencia" }),
    );
  });

  // S-PAGE-3: ?tab=stock renders StockPanel
  it("S-PAGE-3: ?tab=stock calls stock loader", async () => {
    const staffAuth = await import("@/lib/staff/auth");
    vi.mocked(staffAuth.requireStaffOrAdmin).mockResolvedValue(staffUser);

    const stockLoader = await import("@/lib/staff/stock");

    const { default: StaffPage } = await getPage();
    await StaffPage({ searchParams: Promise.resolve({ store: "providencia", tab: "stock" }) });

    expect(vi.mocked(stockLoader.searchProductsWithStock)).toHaveBeenCalled();
  });

  // S-PAGE-4: ?tab=clientes renders CustomersPanel
  it("S-PAGE-4: ?tab=clientes calls customers loader", async () => {
    const staffAuth = await import("@/lib/staff/auth");
    vi.mocked(staffAuth.requireStaffOrAdmin).mockResolvedValue(staffUser);

    const customersLoader = await import("@/lib/staff/customers");

    const { default: StaffPage } = await getPage();
    await StaffPage({ searchParams: Promise.resolve({ store: "providencia", tab: "clientes" }) });

    expect(vi.mocked(customersLoader.searchCustomers)).toHaveBeenCalled();
  });

  // S-PAGE-5: no ?tab → defaults to citas
  it("S-PAGE-5: default tab=citas calls listTodayAppointments", async () => {
    const staffAuth = await import("@/lib/staff/auth");
    vi.mocked(staffAuth.requireStaffOrAdmin).mockResolvedValue(staffUser);

    const apptLoader = await import("@/lib/staff/appointments");

    const { default: StaffPage } = await getPage();
    await StaffPage({ searchParams: Promise.resolve({ store: "providencia" }) });

    expect(vi.mocked(apptLoader.listTodayAppointments)).toHaveBeenCalled();
  });

  // S-PAGE-6: ?tab=pedidos → OrdersPlaceholder (no loader calls)
  it("S-PAGE-6: ?tab=pedidos — no data loaders called", async () => {
    const staffAuth = await import("@/lib/staff/auth");
    vi.mocked(staffAuth.requireStaffOrAdmin).mockResolvedValue(staffUser);

    const stockLoader = await import("@/lib/staff/stock");
    const apptLoader = await import("@/lib/staff/appointments");
    const customersLoader = await import("@/lib/staff/customers");

    const { default: StaffPage } = await getPage();
    await StaffPage({ searchParams: Promise.resolve({ store: "providencia", tab: "pedidos" }) });

    expect(vi.mocked(stockLoader.searchProductsWithStock)).not.toHaveBeenCalled();
    expect(vi.mocked(apptLoader.listTodayAppointments)).not.toHaveBeenCalled();
    expect(vi.mocked(customersLoader.searchCustomers)).not.toHaveBeenCalled();
  });
});
