import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getUserPointsBalance, getUserPointsHistory } from "@/lib/admin/points";
import { loadAdminUserRows } from "@/lib/admin/users";
import Link from "next/link";
import { PuntosAdminPanel } from "./puntos-admin-client";

type PageProps = {
  searchParams: { userId?: string } | Promise<{ userId?: string }>;
};

export default async function PuntosAdminPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");

  // Next.js 16 — searchParams is async
  const params =
    searchParams instanceof Promise ? await searchParams : searchParams;
  const selectedUserId = params.userId;

  let selectedUser: { id: string; name: string; email: string } | null = null;
  let balance = 0;
  let history: Awaited<ReturnType<typeof getUserPointsHistory>> = [];

  if (selectedUserId) {
    const allUsers = await loadAdminUserRows();
    const found = allUsers.find((u) => u.id === selectedUserId);
    if (found) {
      selectedUser = { id: found.id, name: found.name, email: found.email };
      [balance, history] = await Promise.all([
        getUserPointsBalance(selectedUserId),
        getUserPointsHistory(selectedUserId, 50),
      ]);
    }
  }

  // Load users for search
  const allUsers = await loadAdminUserRows();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Puntos de fidelidad</h1>
      </div>

      {/* User search */}
      <section className="space-y-3">
        <h2 className="text-base font-medium text-muted-foreground">
          Buscar usuario
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {allUsers.map((u) => (
            <Link
              key={u.id}
              href={`/admin/puntos?userId=${u.id}`}
              className={`rounded-lg border p-3 text-sm hover:bg-accent transition-colors ${
                selectedUserId === u.id ? "bg-accent border-primary" : ""
              }`}
            >
              <p className="font-medium">{u.name}</p>
              <p className="text-xs text-muted-foreground">{u.email}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Selected user panel */}
      {selectedUser && (
        <section>
          <PuntosAdminPanel
            userId={selectedUser.id}
            userName={`${selectedUser.name} (${selectedUser.email})`}
            balance={balance}
            history={history}
          />
        </section>
      )}
    </div>
  );
}
