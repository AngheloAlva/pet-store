import Link from "next/link";
import {
  SquaresFour,
  Package,
  Tag,
  Storefront,
  Users,
  Scissors,
  Clock,
  CalendarCheck,
  PawPrint,
  Star,
  Newspaper,
  ShoppingBag,
  Gear,
  FileText,
} from "@phosphor-icons/react/dist/ssr";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: SquaresFour, disabled: false },
  { label: "Productos", href: "/admin/productos", icon: Package, disabled: false },
  { label: "Servicios", href: "/admin/servicios", icon: Scissors, disabled: false },
  { label: "Categorías", href: "/admin/categorias", icon: Tag, disabled: false },
  { label: "Sucursales", href: "/admin/sucursales", icon: Storefront, disabled: false },
  { label: "Horarios", href: "/admin/horarios", icon: Clock, disabled: false },
  { label: "Citas", href: "/admin/citas", icon: CalendarCheck, disabled: false },
  { label: "Mascotas", href: "/admin/mascotas", icon: PawPrint, disabled: false },
  { label: "Puntos", href: "/admin/puntos", icon: Star, disabled: false },
  { label: "Blog", href: "/admin/blog", icon: Newspaper, disabled: false },
  { label: "Pedidos", href: "/admin/pedidos", icon: ShoppingBag, disabled: false },
  { label: "Documentos", href: "/admin/documentos", icon: FileText, disabled: false },
  { label: "Configuración", href: "/admin/configuracion", icon: Gear, disabled: false },
  { label: "Usuarios", href: "/admin/usuarios", icon: Users, disabled: false },
] as const;

export function AdminSidebar() {
  return (
    <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible p-2 md:p-4 border-b md:border-b-0 md:w-56 md:border-r md:border-border md:min-h-[calc(100vh-4rem)]">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        if (item.disabled) {
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-disabled="true"
              tabIndex={-1}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm opacity-50 cursor-not-allowed pointer-events-none"
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        }
        return (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <Icon size={16} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
