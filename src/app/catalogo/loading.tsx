import { Container } from "@/components/layout/container";
import { ProductCardSkeleton } from "@/components/product/product-card-skeleton";

export default function Loading() {
  return (
    <Container className="py-8">
      <div
        role="status"
        aria-label="Cargando productos"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
        <span className="sr-only">Cargando…</span>
      </div>
    </Container>
  );
}
