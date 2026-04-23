import {
  Truck,
  Storefront,
  ShieldCheck,
  Gift,
} from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/layout/container";

const items = [
  {
    icon: Truck,
    title: "Despacho a todo Chile",
    description: "Envíos rápidos y seguros con seguimiento.",
  },
  {
    icon: Storefront,
    title: "Retiro en tienda",
    description: "Retira gratis en 4 sucursales de Santiago.",
  },
  {
    icon: ShieldCheck,
    title: "Compra protegida",
    description: "Pagos seguros con WebPay y MercadoPago.",
  },
  {
    icon: Gift,
    title: "Puntos en cada compra",
    description: "Acumula y canjea en web o en tienda.",
  },
];

export function TrustStrip() {
  return (
    <section className="border-b border-border bg-background">
      <Container className="py-8">
        <ul className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {items.map((item) => (
            <li key={item.title} className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <item.icon size={20} weight="regular" />
              </div>
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
