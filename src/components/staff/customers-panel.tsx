import type { CustomerRow } from "@/lib/staff/customers";
import { CustomerSearchInput } from "./customer-search-input";
import { CustomerDetailCard } from "./customer-detail-card";

interface CustomersPanelProps {
  initialResults: CustomerRow[];
  query?: string;
}

export function CustomersPanel({ initialResults, query = "" }: CustomersPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <CustomerSearchInput query={query} />
      {initialResults.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {query ? "Sin resultados para tu búsqueda." : "Ingresá nombre, email o RUT para buscar."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {initialResults.map((customer) => (
            <li key={customer.id}>
              <CustomerDetailCard customer={customer} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
