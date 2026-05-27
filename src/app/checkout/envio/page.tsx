import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db, dbReady } from "@/db";
import { checkoutSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getShippingOptions } from "@/lib/checkout/shipping";
import { EnvioForm } from "./envio-form";

export default async function EnvioPage() {
  await dbReady;

  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/checkout/entrega");

  const now = new Date();
  const sessions = await db
    .select()
    .from(checkoutSessions)
    .where(and(eq(checkoutSessions.userId, user.id), eq(checkoutSessions.status, "active")));

  const session = sessions.find((s) => s.expiresAt > now) ?? null;

  if (!session) redirect("/carrito");
  if (!session.address) redirect("/checkout/entrega");

  const options = getShippingOptions();

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Método de envío</h2>
      <EnvioForm
        sessionId={session.id}
        options={[...options]}
        selectedOptionId={session.shippingOptionId}
      />
    </div>
  );
}
