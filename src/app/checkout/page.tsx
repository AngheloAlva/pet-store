import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db, dbReady } from "@/db";
import { checkoutSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

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

  // Redirect to first incomplete step
  if (!session.address) {
    redirect("/checkout/entrega");
  }

  if (!session.shippingOptionId) {
    redirect("/checkout/envio");
  }

  redirect("/checkout/resumen");
}
