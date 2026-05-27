import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { dbReady } from "@/db";
import { checkoutSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await dbReady;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackUrl=/checkout/entrega");
  }

  // Check for active session — redirect to cart if none
  const now = new Date();
  const activeSessions = await db
    .select({ id: checkoutSessions.id, expiresAt: checkoutSessions.expiresAt, status: checkoutSessions.status })
    .from(checkoutSessions)
    .where(
      and(
        eq(checkoutSessions.userId, user.id),
        eq(checkoutSessions.status, "active"),
      ),
    );

  const activeSession = activeSessions.find((s) => s.expiresAt > now) ?? null;

  // Only redirect to cart from layout if NOT on the entrega page
  // (entrega calls startCheckoutSession which creates the session)
  // The individual pages handle session guards more precisely

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
          {activeSession && (
            <p className="text-sm text-gray-500 mt-1">
              Sesión activa hasta{" "}
              {activeSession.expiresAt.toLocaleTimeString("es-CL", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
