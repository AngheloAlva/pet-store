import { loadAdminUserRows } from "@/lib/admin/users";
import { UsersListClient } from "@/components/admin/users/users-list-client";

export default async function UsuariosPage() {
  const users = await loadAdminUserRows();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuarios</h1>
      </div>

      <UsersListClient rows={users} />
    </div>
  );
}
