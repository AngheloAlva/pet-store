import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db, dbReady } from "@/db";
import { checkoutSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requiresAddress } from "@/lib/shipping/requires-address";

export default async function CheckoutPage() {
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

  // F3.3: Step 0 — delivery type must be selected first
  const deliveryType = (session.deliveryType as "despacho" | "pickup" | "courier" | null) ?? null;
  if (!deliveryType) {
    redirect("/checkout/tipo-entrega");
  }

  // F3.3: Pickup skips address step entirely
  if (!requiresAddress(deliveryType)) {
    if (!session.shippingOptionId && deliveryType !== "pickup") {
      redirect("/checkout/envio");
    }
    if (deliveryType === "pickup") {
      // Pickup goes directly to envio (store picker)
      if (!session.pickupStoreId) {
        redirect("/checkout/envio");
      }
      redirect("/checkout/resumen");
    }
  }

  // despacho / courier path
  if (!session.address) {
    redirect("/checkout/entrega");
  }

  if (!session.shippingOptionId) {
    redirect("/checkout/envio");
  }

  redirect("/checkout/resumen");
}
