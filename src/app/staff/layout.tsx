import { requireStaffOrAdmin } from "@/lib/staff/auth";
import type { ReactNode } from "react";
import type { SessionUser } from "@/types/session";
import { StorePicker } from "@/components/staff/store-picker";
import { getCachedStores } from "@/db/sync-cache";

interface StaffLayoutProps {
  children: ReactNode;
  searchParams?: Promise<{ store?: string }>;
}

export default async function StaffLayout({ children, searchParams }: StaffLayoutProps) {
  const user: SessionUser = await requireStaffOrAdmin();

  const resolvedParams = await (searchParams ?? Promise.resolve({} as { store?: string }));
  const activeStoreId = resolvedParams.store ?? user.storeId;

  const allStores = getCachedStores();
  const activeStore = activeStoreId
    ? allStores.find((s) => s.id === activeStoreId)
    : null;

  const storeName = activeStore?.name ?? "Todas las sucursales";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex h-14 items-center gap-4 px-4">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            Modo Staff
          </span>
          <span className="text-sm font-medium truncate">{storeName}</span>
          <div className="ml-auto">
            {user.role === "admin" && (
              <StorePicker stores={allStores} mode="compact" currentStoreId={activeStoreId} />
            )}
          </div>
        </div>
      </header>
      <main className="p-4 gap-6">{children}</main>
    </div>
  );
}
