/**
 * /checkout/pendiente/[orderNumber] — F3.2b
 * RSC page shown after a customer submits a transfer receipt.
 * Displays pending-verification confirmation. Does NOT show DTE or points.
 */
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db, dbReady } from "@/db";
import { orders } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import Link from "next/link";

interface PendientePageProps {
  params: Promise<{ orderNumber: string }>;
  // For testing: allow injecting pre-fetched order data
  orderData?: {
    id: string;
    orderNumber: string;
    paymentStatus: string;
  };
}

export default async function PendientePage({ params, orderData }: PendientePageProps) {
  const { orderNumber } = await params;

  // Allow test injection of order data
  let order: { id: string; orderNumber: string; paymentStatus: string };

  if (orderData) {
    order = orderData;
  } else {
    await dbReady;
    const user = await getCurrentUser();
    if (!user) redirect(`/login?callbackUrl=/checkout/pendiente/${orderNumber}`);

    const orderRows = await db
      .select()
      .from(orders)
      .where(and(eq(orders.orderNumber, orderNumber), eq(orders.userId, user.id)));

    if (orderRows.length === 0) redirect("/");

    order = orderRows[0];
  }

  return (
    <div className="space-y-6">
      {/* Pending header */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-3">
          <span className="text-yellow-600 text-2xl">⏳</span>
        </div>
        <h1 className="text-2xl font-bold text-yellow-800 mb-1">
          Transfer awaiting verification
        </h1>
        <p className="text-yellow-700 text-sm">
          Order number:{" "}
          <span className="font-mono font-semibold">{order.orderNumber}</span>
        </p>
      </div>

      {/* Under review message */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">What happens next?</h2>
        <p className="text-sm text-gray-600">
          Your transfer receipt is now pending admin review. Once verified by our team,
          your order will be confirmed and you will receive a confirmation email.
        </p>
        <p className="text-sm text-gray-500">
          Payment status: <span className="font-medium text-yellow-700">Under review</span>
        </p>
        <p className="text-xs text-gray-400">
          This process typically takes 1-2 business days.
        </p>
      </div>

      {/* CTA */}
      <div>
        <Link
          href="/catalogo"
          className="block w-full text-center border border-yellow-600 text-yellow-700 hover:bg-yellow-50 font-medium py-2.5 px-4 rounded-md transition-colors"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
