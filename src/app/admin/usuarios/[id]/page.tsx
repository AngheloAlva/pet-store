import { notFound, redirect } from "next/navigation";
import { loadUserForEdit, loadAllStores } from "@/lib/admin/users";
import { updateUserIdentity } from "@/app/actions/admin/users";
import { UserIdentityForm } from "@/components/admin/users/user-identity-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function UsuarioDetailPage({ params }: Props) {
  const { id } = await params;

  const [user, stores] = await Promise.all([
    loadUserForEdit(id),
    loadAllStores(),
  ]);

  if (!user) notFound();

  const storeOptions = stores.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Usuario: {user.name}</h1>

      <UserIdentityForm
        user={user}
        stores={storeOptions}
        action={updateUserIdentity.bind(null, id)}
        onDeleteSuccess={async () => {
          "use server";
          redirect("/admin/usuarios");
        }}
      />
    </div>
  );
}
