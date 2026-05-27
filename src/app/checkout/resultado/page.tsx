import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { confirmOrder } from "@/app/actions/checkout/confirm-order";
import Link from "next/link";

interface ResultadoPageProps {
  searchParams: Promise<{ paymentId?: string; token?: string; sessionId?: string }>;
}

export default async function ResultadoPage({ searchParams }: ResultadoPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/checkout/entrega");

  const { token, sessionId: sessionIdParam } = params;

  // sessionId may come from query params or paymentId (mock uses paymentId = sessionId)
  const sessionId = sessionIdParam ?? params.paymentId;

  if (!sessionId || !token) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <h2 className="text-xl font-semibold text-red-700 mb-2">Error en el pago</h2>
        <p className="text-gray-600 mb-4">Parámetros de pago inválidos.</p>
        <Link href="/carrito" className="text-green-600 hover:underline">
          Volver al carrito
        </Link>
      </div>
    );
  }

  const result = await confirmOrder({ sessionId, gatewayToken: token });

  if (!result.ok) {
    let message = "Error al confirmar el pedido.";
    let cta = "/carrito";
    let ctaLabel = "Volver al carrito";

    if (result.code === "PAYMENT_REJECTED") {
      message = "Tu pago fue rechazado. Por favor intenta con otro método de pago.";
      cta = "/checkout/pago";
      ctaLabel = "Reintentar pago";
    } else if (result.code === "OUT_OF_STOCK") {
      message = `El producto "${result.productName}" se agotó. Por favor ajusta tu carrito.`;
      cta = "/carrito";
      ctaLabel = "Volver al carrito";
    } else if (result.code === "SESSION_EXPIRED") {
      message = "Tu sesión de checkout expiró.";
    }

    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-xl">✗</span>
        </div>
        <h2 className="text-xl font-semibold text-red-700 mb-2">Error en el pedido</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <Link
          href={cta}
          className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-6 rounded-md transition-colors"
        >
          {ctaLabel}
        </Link>
      </div>
    );
  }

  redirect(`/checkout/confirmacion/${result.orderNumber}`);
}
