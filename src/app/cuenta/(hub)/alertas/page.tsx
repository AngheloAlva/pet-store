import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { restockAlerts, products, productVariants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AlertasClient } from "./alertas-client";

export interface AlertRow {
  id: string;
  email: string;
  userId: string | null;
  productId: string;
  variantId: string | null;
  storeIds: string[] | null;
  status: "pending" | "fired" | "canceled";
  cancelToken: string;
  createdAt: Date;
  firedAt: Date | null;
  canceledAt: Date | null;
  productName: string;
  variantName: string | null;
}

export default async function AlertasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Fetch user's alerts with product and variant names
  const rawAlerts = await db
    .select({
      id: restockAlerts.id,
      email: restockAlerts.email,
      userId: restockAlerts.userId,
      productId: restockAlerts.productId,
      variantId: restockAlerts.variantId,
      storeIds: restockAlerts.storeIds,
      status: restockAlerts.status,
      cancelToken: restockAlerts.cancelToken,
      createdAt: restockAlerts.createdAt,
      firedAt: restockAlerts.firedAt,
      canceledAt: restockAlerts.canceledAt,
      productName: products.name,
      variantName: productVariants.name,
    })
    .from(restockAlerts)
    .leftJoin(products, eq(restockAlerts.productId, products.id))
    .leftJoin(productVariants, eq(restockAlerts.variantId, productVariants.id))
    .where(eq(restockAlerts.userId, user.id));

  const alerts: AlertRow[] = rawAlerts.map((a) => ({
    id: a.id,
    email: a.email,
    userId: a.userId,
    productId: a.productId,
    variantId: a.variantId,
    storeIds: a.storeIds,
    status: a.status as "pending" | "fired" | "canceled",
    cancelToken: a.cancelToken,
    createdAt: a.createdAt,
    firedAt: a.firedAt,
    canceledAt: a.canceledAt,
    productName: a.productName ?? a.productId,
    variantName: a.variantName ?? null,
  }));

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <h1 className="text-3xl font-bold">Mis alertas de reposición</h1>

      {alerts.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No tenés alertas activas. Cuando un producto que te interesa esté agotado, podés suscribirte para recibir un aviso.
        </p>
      ) : (
        <AlertasClient alerts={alerts} />
      )}
    </div>
  );
}
