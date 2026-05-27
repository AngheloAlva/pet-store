import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db, dbReady } from "@/db";
import { checkoutSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { EntregaForm } from "./entrega-form";
import { COVERED_COMMUNES } from "@/lib/checkout/communes";

export default async function EntregaPage() {
  await dbReady;

  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/checkout/entrega");

  const now = new Date();
  const sessions = await db
    .select()
    .from(checkoutSessions)
    .where(and(eq(checkoutSessions.userId, user.id), eq(checkoutSessions.status, "active")));

  const session = sessions.find((s) => s.expiresAt > now) ?? null;

  if (!session) {
    redirect("/carrito");
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Dirección de entrega</h2>
      <EntregaForm
        sessionId={session.id}
        communes={[...COVERED_COMMUNES]}
        initialAddress={session.address as Record<string, string> | null}
      />
    </div>
  );
}
