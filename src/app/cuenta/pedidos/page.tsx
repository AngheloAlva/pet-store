import Link from "next/link";
import { getOwnOrders } from "@/app/actions/cuenta/pedidos";

export default async function PedidosPage() {
  const orders = await getOwnOrders();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mis Pedidos</h1>

      {orders.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">Todavía no tenés pedidos realizados.</p>
          <Link
            href="/catalogo"
            className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90"
          >
            Ir al catálogo
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="pb-2 font-medium">Número</th>
                <th className="pb-2 font-medium">Fecha</th>
                <th className="pb-2 font-medium">Estado</th>
                <th className="pb-2 font-medium">Pago</th>
                <th className="pb-2 font-medium text-right">Total</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="py-3 font-medium">{order.orderNumber}</td>
                  <td className="py-3 text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("es-CL")}
                  </td>
                  <td className="py-3 capitalize">{order.status}</td>
                  <td className="py-3 capitalize">{order.paymentStatus}</td>
                  <td className="py-3 text-right">
                    ${order.total.toLocaleString("es-CL")}
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/cuenta/pedidos/${order.orderNumber}`}
                      className="text-primary hover:underline text-xs"
                    >
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
