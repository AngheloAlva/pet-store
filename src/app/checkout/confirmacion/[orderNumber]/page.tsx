import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db, dbReady } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import Link from "next/link";

interface ConfirmacionPageProps {
  params: Promise<{ orderNumber: string }>;
}

export default async function ConfirmacionPage({ params }: ConfirmacionPageProps) {
  await dbReady;

  const { orderNumber } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/checkout/entrega");

  // Fetch order
  const orderRows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderNumber, orderNumber), eq(orders.userId, user.id)));

  if (orderRows.length === 0) notFound();

  const order = orderRows[0];
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const address = order.address as Record<string, string>;

  return (
    <div className="space-y-6">
      {/* Success header */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <span className="text-green-600 text-2xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold text-green-800 mb-1">¡Pedido confirmado!</h1>
        <p className="text-green-700 text-sm">
          Número de pedido:{" "}
          <span className="font-mono font-semibold">{order.orderNumber}</span>
        </p>
      </div>

      {/* Order items */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Productos</h2>
        <div className="divide-y divide-gray-100">
          {items.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">
                  x{item.quantity} · ${item.unitPrice.toLocaleString("es-CL")} c/u
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                ${item.lineTotal.toLocaleString("es-CL")}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>${order.subtotal.toLocaleString("es-CL")}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Despacho</span>
            <span>${order.shippingCost.toLocaleString("es-CL")}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-100">
            <span>Total</span>
            <span>${order.total.toLocaleString("es-CL")}</span>
          </div>
        </div>
      </div>

      {/* Shipping address */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Dirección de entrega</h3>
        <p className="text-sm text-gray-600">
          {address.recipientName}
          {address.street && `, ${address.street} ${address.number ?? ""}`}
          {address.commune && `, ${address.commune}`}
          {address.region && `, ${address.region}`}
        </p>
      </div>

      {/* Points earned */}
      {order.pointsEarned > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="font-medium text-yellow-800">
              ¡Ganaste {order.pointsEarned} puntos!
            </p>
            <p className="text-sm text-yellow-700">
              Los puntos se acreditan automáticamente a tu cuenta.
            </p>
          </div>
        </div>
      )}

      {/* DTE reference */}
      {order.dteId && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            Referencia DTE:{" "}
            <span className="font-mono text-gray-800">{order.dteId}</span>
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="flex gap-3">
        <Link
          href="/catalogo"
          className="flex-1 text-center border border-green-600 text-green-600 hover:bg-green-50 font-medium py-2.5 px-4 rounded-md transition-colors"
        >
          Seguir comprando
        </Link>
        <Link
          href="/demo/inbox"
          className="flex-1 text-center bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-md transition-colors"
        >
          Ver email de confirmación
        </Link>
      </div>
    </div>
  );
}
