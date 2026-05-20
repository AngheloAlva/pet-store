import type { CustomerRow } from "@/lib/staff/customers";

interface CustomerDetailCardProps {
  customer: CustomerRow;
}

export function CustomerDetailCard({ customer }: CustomerDetailCardProps) {
  return (
    <div className="rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors">
      <p className="font-medium">{customer.name}</p>
      <p className="text-sm text-muted-foreground">{customer.email}</p>
      {customer.rut && (
        <p className="text-xs text-muted-foreground">RUT: {customer.rut}</p>
      )}
    </div>
  );
}
