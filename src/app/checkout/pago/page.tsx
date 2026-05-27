import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db, dbReady } from "@/db";
import { checkoutSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { PagoForm } from "./pago-form";

export default async function PagoPage() {
  await dbReady;

  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/checkout/entrega");

  const now = new Date();
  const sessions = await db
    .select()
    .from(checkoutSessions)
    .where(
      and(
        eq(checkoutSessions.userId, user.id),
      ),
    );

  const session = sessions
    .filter((s) => s.status === "active" || s.status === "payment_pending")
    .find((s) => s.expiresAt > now) ?? null;

  if (!session) redirect("/carrito");
  if (!session.address) redirect("/checkout/entrega");
  if (!session.shippingOptionId) redirect("/checkout/envio");

  // Compute total from cart snapshot
  const cartSnapshot = session.cartSnapshot as Array<{ unitPrice: number; quantity: number; lineTotal?: number }>;
  const subtotal = cartSnapshot.reduce((sum, l) => sum + (l.lineTotal ?? l.unitPrice * l.quantity), 0);
  const total = subtotal + (session.shippingCost ?? 0);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Método de pago</h2>
      <PagoForm sessionId={session.id} total={total} />
    </div>
  );
}
