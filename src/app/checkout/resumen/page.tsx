import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db, dbReady } from "@/db";
import { checkoutSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import Link from "next/link";

interface CartLine {
  variantId: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export default async function ResumenPage() {
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
  if (!session.shippingOptionId) redirect("/checkout/envio");

  const cartLines = (session.cartSnapshot as CartLine[]) ?? [];
  const subtotal = cartLines.reduce((s, l) => s + l.lineTotal, 0);
  const shipping = session.shippingCost ?? 0;
  const total = subtotal + shipping;
  const address = session.address as Record<string, string>;

  return (
    <div className="space-y-6">
      {/* Order Lines */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Tu pedido</h2>
        <div className="divide-y divide-gray-100">
          {cartLines.map((line) => (
            <div key={line.variantId} className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{line.name}</p>
                <p className="text-xs text-gray-500">SKU: {line.sku} · Cantidad: {line.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                ${line.lineTotal.toLocaleString("es-CL")}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>${subtotal.toLocaleString("es-CL")}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Despacho</span>
            <span>${shipping.toLocaleString("es-CL")}</span>
          </div>

          {/* Stub: wallet */}
          <div className="flex justify-between text-sm text-gray-400">
            <span>Wallet</span>
            <span className="italic">Próximamente</span>
          </div>

          <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-100">
            <span>Total</span>
            <span>${total.toLocaleString("es-CL")}</span>
          </div>
        </div>

        {/* Stub: coupon input */}
        <div className="mt-4">
          <input
            type="text"
            disabled
            placeholder="Código de cupón — Próximamente"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
          />
        </div>
      </div>

      {/* Shipping address */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Dirección de entrega</h3>
        <p className="text-sm text-gray-600">
          {address.recipientName}
          {address.street && `, ${address.street} ${address.number ?? ""}`}
          {address.apartment && ` ${address.apartment}`}
          {address.commune && `, ${address.commune}`}
          {address.region && `, ${address.region}`}
        </p>
        {address.phone && <p className="text-sm text-gray-500 mt-1">{address.phone}</p>}
      </div>

      {/* CTA */}
      <Link
        href="/checkout/pago"
        className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-md transition-colors"
      >
        Ir al pago
      </Link>
    </div>
  );
}
