import { requireStaffOrAdmin } from "@/lib/staff/auth";
import { searchProductsWithStock } from "@/lib/staff/stock";
import { searchCustomers } from "@/lib/staff/customers";
import { listTodayAppointments } from "@/lib/staff/appointments";
import { getCachedStores } from "@/db/sync-cache";
import { SectionTabs } from "@/components/staff/section-tabs";
import { StockPanel } from "@/components/staff/stock-panel";
import { CustomersPanel } from "@/components/staff/customers-panel";
import { AppointmentsPanel } from "@/components/staff/appointments-panel";
import { OrdersPlaceholder } from "@/components/staff/orders-placeholder";
import { StorePicker } from "@/components/staff/store-picker";

interface StaffPageProps {
  searchParams: Promise<{ store?: string; tab?: string; q?: string }>;
}

export default async function StaffPage({ searchParams }: StaffPageProps) {
  const { store, tab = "citas", q } = await searchParams;
  const user = await requireStaffOrAdmin();

  // Resolve active store
  const activeStoreId: string | null =
    user.role === "admin" ? (store ?? null) : (store ?? user.storeId);

  // Admin without store selection → render blocking store picker
  if (activeStoreId === null) {
    const allStores = getCachedStores();
    return <StorePicker stores={allStores} mode="full" />;
  }

  // Render tabs + panel based on active tab
  let panel: React.ReactNode;

  if (tab === "stock") {
    const query = q ?? "";
    const results = await searchProductsWithStock({ query, storeId: activeStoreId });
    panel = <StockPanel initialResults={results} query={query} storeId={activeStoreId} />;
  } else if (tab === "clientes") {
    const query = q ?? "";
    const results = await searchCustomers({ query });
    panel = <CustomersPanel initialResults={results} query={query} />;
  } else if (tab === "pedidos") {
    panel = <OrdersPlaceholder />;
  } else {
    // Default: "citas"
    const todayAppointments = await listTodayAppointments({ storeId: activeStoreId });
    panel = <AppointmentsPanel storeId={activeStoreId} initialAppointments={todayAppointments} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionTabs activeTab={tab} storeId={activeStoreId} />
      {panel}
    </div>
  );
}
