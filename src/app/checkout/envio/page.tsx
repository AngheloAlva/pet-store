import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db, dbReady } from "@/db";
import { checkoutSessions, stores } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getShippingOptions, getOptionsForCommune } from "@/lib/checkout/shipping";
import { getAppSettings } from "@/app/actions/admin/settings";
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

  const deliveryType = session.deliveryType as "despacho" | "pickup" | "courier" | null;

  // Pickup path — no address needed; show store picker
  if (deliveryType === "pickup") {
    const allStores = await db.select().from(stores);

    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Seleccioná la tienda de retiro</h2>
        <EnvioForm
          sessionId={session.id}
          mode="pickup"
          stores={allStores.map((s) => ({ id: s.id, name: s.name, address: s.address, commune: s.commune }))}
          selectedStoreId={session.pickupStoreId ?? null}
          options={[]}
          selectedOptionId={null}
        />
      </div>
    );
  }

  // despacho / courier — require address
  if (!session.address) redirect("/checkout/entrega");

  // Get carrier options if commune known
  const settings = await getAppSettings();
  const address = session.address as { commune?: string } | null;
  const commune = address?.commune;

  let options = getShippingOptions();
  if (commune) {
    const carrierOptions = await getOptionsForCommune(commune, settings, 0, "RM");
    if (carrierOptions.length > 0) {
      options = carrierOptions as typeof options;
    }
  }

  const dispatchSlots = settings.dispatchSlots ?? ["mañana", "tarde"];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Método de envío</h2>
      <EnvioForm
        sessionId={session.id}
        mode={deliveryType ?? "despacho"}
        stores={[]}
        selectedStoreId={null}
        options={[...options]}
        selectedOptionId={session.shippingOptionId ?? null}
        dispatchSlots={dispatchSlots}
        selectedDispatchSlot={session.dispatchSlot ?? null}
      />
    </div>
  );
}
