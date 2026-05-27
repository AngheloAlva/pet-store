/**
 * /cuenta/pedidos/[orderNumber] — F3.4 (ORD-2, ORD-3, ORD-5)
 * RSC: owner-scoped order detail with items, shipment, and "Ver producto" stub.
 * params is Promise<{orderNumber: string}> per Next.js 16 convention.
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { getOwnOrderDetail } from "@/app/actions/cuenta/pedidos";

interface OrderDetailPageProps {
  params: Promise<{ orderNumber: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { orderNumber } = await params;
  const result = await getOwnOrderDetail(orderNumber);

  if (!result) notFound();

  const { order, items, shipment } = result;
  const firstItem = items[0];

  const showTrackingLink =
    shipment &&
    shipment.trackingNumber &&
    shipment.carrier !== "propio" &&
    shipment.carrier !== "pickup";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Summary */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
        <p className="text-sm text-muted-foreground">
          {new Date(order.createdAt).toLocaleDateString("es-CL", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Status card */}
      <div className="border rounded-md px-4 py-3 flex gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Estado:</span>{" "}
          <span className="font-medium capitalize">{order.status}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Pago:</span>{" "}
          <span className="font-medium capitalize">{order.paymentStatus}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Total:</span>{" "}
          <span className="font-medium">${order.total.toLocaleString("es-CL")}</span>
        </div>
      </div>

      {/* Items */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Productos</h2>
        <ul className="divide-y border rounded-md">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-3 flex justify-between items-center text-sm">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-muted-foreground text-xs">
                  {item.quantity} × ${item.unitPrice.toLocaleString("es-CL")}
                </p>
              </div>
              <span className="font-medium">${item.lineTotal.toLocaleString("es-CL")}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Shipment panel */}
      {shipment && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Envío</h2>
          <div className="border rounded-md px-4 py-3 space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Carrier:</span>{" "}
              <span className="capitalize">{shipment.carrier}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Estado:</span>{" "}
              <span className="capitalize">{shipment.status}</span>
            </div>
            {shipment.carrier === "pickup" && (
              <p className="text-muted-foreground">Retiro en tienda disponible.</p>
            )}
            {shipment.carrier === "propio" && (
              <p className="text-muted-foreground">Despacho propio — te contactaremos para coordinar.</p>
            )}
            {showTrackingLink && (
              <Link
                href={`/tracking/${shipment.trackingNumber}`}
                className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
              >
                Ver seguimiento
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Re-order stub — "Ver producto" (ORD-3) */}
      {firstItem && (firstItem.slug ?? firstItem.productId) && (
        <div className="pt-2">
          <Link
            href={`/producto/${firstItem.slug ?? firstItem.productId}`}
            className="inline-block border border-primary text-primary px-4 py-2 rounded-md text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Ver producto
          </Link>
        </div>
      )}
    </div>
  );
}
