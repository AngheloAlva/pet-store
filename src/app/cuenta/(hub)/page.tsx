import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag, Star, CalendarCheck, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { getCurrentUser } from "@/lib/session";
import { getOwnOrders } from "@/app/actions/cuenta/pedidos";

export const metadata: Metadata = {
  title: "Mi cuenta",
  description: "Gestiona tus pedidos, puntos y mascotas.",
  alternates: { canonical: "/cuenta" },
};

export default async function CuentaPage() {
  const user = await getCurrentUser();
  // user is guaranteed by layout, but we use it for personalization
  const recentOrders = user ? await getOwnOrders() : [];
  const topOrders = recentOrders.slice(0, 3);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Mi cuenta</h1>

      {/* Recent orders */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ShoppingBag size={20} />
            Mis Pedidos
          </h2>
          <Link
            href="/cuenta/pedidos"
            className="text-sm text-primary flex items-center gap-1 hover:underline"
          >
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>

        {topOrders.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Todavía no tenés pedidos.{" "}
            <Link href="/catalogo" className="underline">
              Explorá el catálogo
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {topOrders.map((order) => (
              <li key={order.id} className="border rounded-md px-4 py-3 text-sm flex justify-between items-center">
                <span className="font-medium">{order.orderNumber}</span>
                <span className="text-muted-foreground capitalize">{order.status}</span>
                <Link href={`/cuenta/pedidos/${order.orderNumber}`} className="text-primary hover:underline">
                  Ver detalle
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Points balance stub */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Star size={20} />
            Mis Puntos
          </h2>
          <Link
            href="/cuenta/puntos"
            className="text-sm text-primary flex items-center gap-1 hover:underline"
          >
            Ver detalle <ArrowRight size={14} />
          </Link>
        </div>
        <div className="border rounded-md px-4 py-3 text-sm text-muted-foreground">
          Acumulá puntos con cada compra y canjealos en tu próximo pedido.
        </div>
      </section>

      {/* Upcoming appointments stub */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CalendarCheck size={20} />
            Mis Citas
          </h2>
          <Link
            href="/cuenta/citas"
            className="text-sm text-primary flex items-center gap-1 hover:underline"
          >
            Ver todas <ArrowRight size={14} />
          </Link>
        </div>
        <div className="border rounded-md px-4 py-3 text-sm text-muted-foreground">
          Agendá o administrá tus citas de peluquería y veterinaria.
        </div>
      </section>
    </div>
  );
}
