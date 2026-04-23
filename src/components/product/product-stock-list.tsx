import { CheckCircle, Warning, XCircle } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { getProductStockMatrix } from "@/lib/stock";
import type { StockStatus } from "@/types";

type Props = {
  variantId: string;
};

const statusMeta: Record<
  StockStatus,
  { label: string; Icon: typeof CheckCircle; className: string }
> = {
  in_stock: {
    label: "Disponible",
    Icon: CheckCircle,
    className: "text-primary",
  },
  low_stock: {
    label: "Últimas unidades",
    Icon: Warning,
    className: "text-amber-600 dark:text-amber-400",
  },
  out_of_stock: {
    label: "Sin stock",
    Icon: XCircle,
    className: "text-destructive",
  },
};

export function ProductStockList({ variantId }: Props) {
  const rows = getProductStockMatrix(variantId);

  return (
    <section aria-label="Stock por sucursal">
      <h3 className="mb-2 text-sm font-semibold">Stock por sucursal</h3>
      <ul className="flex flex-col gap-2">
        {rows.map(({ store, status }) => {
          const meta = statusMeta[status];
          const Icon = meta.Icon;
          return (
            <li
              key={store.id}
              className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2"
            >
              <span className="text-sm font-medium">{store.name}</span>
              <span className={cn("inline-flex items-center gap-1.5 text-sm", meta.className)}>
                <Icon size={16} weight="fill" />
                {meta.label}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
