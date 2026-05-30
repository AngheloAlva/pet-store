/**
 * /cuenta/suscripciones — F3.5
 * RSC page: lists user's subscriptions.
 * Mirrors pedidos page structure.
 */
import { getSubscriptions } from "@/app/actions/cuenta/suscripciones";

export default async function SuscripcionesPage() {
  const subscriptions = await getSubscriptions();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mis Suscripciones</h1>

      {subscriptions.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">No tenés suscripciones activas.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="pb-2 font-medium">Producto</th>
                <th className="pb-2 font-medium">Frecuencia</th>
                <th className="pb-2 font-medium">Próximo cobro</th>
                <th className="pb-2 font-medium">Estado</th>
                <th className="pb-2 font-medium">Descuento</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="py-3 font-medium">{sub.productId}</td>
                  <td className="py-3 text-muted-foreground">
                    Cada {sub.frequencyDays} días
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {new Date(sub.nextChargeAt).toLocaleDateString("es-CL")}
                  </td>
                  <td className="py-3 capitalize">{sub.status}</td>
                  <td className="py-3">{sub.discountPercent}%</td>
                  <td className="py-3 text-right">
                    <span className="text-xs text-muted-foreground">{sub.id.slice(0, 8)}</span>
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
