import type { ProductStockRow } from "@/lib/staff/stock";
import { StockSearchInput } from "./stock-search-input";

interface StockPanelProps {
  initialResults: ProductStockRow[];
  query?: string;
  storeId: string;
}

const STATUS_COLORS: Record<string, string> = {
  in_stock: "bg-green-100 text-green-800",
  low_stock: "bg-yellow-100 text-yellow-800",
  out_of_stock: "bg-red-100 text-red-800",
};

export function StockPanel({ initialResults, query = "", storeId }: StockPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <StockSearchInput query={query} storeId={storeId} />
      {initialResults.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {query ? "Sin resultados para tu búsqueda." : "Ingresá un término para buscar productos."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {initialResults.map((product) => (
            <li key={product.productId} className="rounded-lg border border-border p-4">
              <p className="font-medium">{product.productName}</p>
              <p className="text-xs text-muted-foreground">{product.brandName}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <span
                    key={v.variantId}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[v.status] ?? ""}`}
                  >
                    {v.variantName}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
