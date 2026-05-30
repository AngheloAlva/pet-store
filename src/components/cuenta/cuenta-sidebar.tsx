"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  ShoppingBag,
  MapPin,
  PawPrint,
  Star,
  CalendarCheck,
  Bell,
  FileText,
  Wallet,
  Gift,
  ArrowsClockwise,
  ChartLine,
} from "@phosphor-icons/react";

const ACTIVE_NAV_ITEMS = [
  { label: "Resumen", href: "/cuenta", icon: House },
  { label: "Mis Pedidos", href: "/cuenta/pedidos", icon: ShoppingBag },
  { label: "Mis Direcciones", href: "/cuenta/direcciones", icon: MapPin },
  { label: "Mis Mascotas", href: "/cuenta/mascotas", icon: PawPrint },
  { label: "Mis Puntos", href: "/cuenta/puntos", icon: Star },
  { label: "Mis Citas", href: "/cuenta/citas", icon: CalendarCheck },
  { label: "Mis Alertas", href: "/cuenta/alertas", icon: Bell },
  { label: "Mis Suscripciones", href: "/cuenta/suscripciones", icon: ArrowsClockwise },
] as const;

const DISABLED_NAV_ITEMS = [
  { label: "Mis Documentos", icon: FileText },
  { label: "Mi Wallet", icon: Wallet },
  { label: "Mis Gift Cards", icon: Gift },
  { label: "Mi Estado de Cuenta", icon: ChartLine },
] as const;

export function CuentaSidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mi cuenta"
      className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible p-2 md:p-4 border-b md:border-b-0 md:w-64 md:border-r md:border-border md:min-h-[calc(100vh-4rem)]"
    >
      {ACTIVE_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Icon size={16} />
            {item.label}
          </Link>
        );
      })}

      <div className="my-2 border-t border-border" />

      {DISABLED_NAV_ITEMS.map((item) => {
        const Icon = item.icon;

        return (
          <span
            key={item.label}
            role="link"
            aria-disabled="true"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm opacity-50 cursor-not-allowed pointer-events-none"
          >
            <Icon size={16} />
            {item.label}
            <span className="ml-auto text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5">
              Próximamente
            </span>
          </span>
        );
      })}
    </nav>
  );
}
