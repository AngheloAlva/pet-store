import Link from "next/link";
import { MagnifyingGlassMinus } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/types";

type CatalogGridProps = {
  products: Product[];
};

export function CatalogGrid({ products }: CatalogGridProps) {
  if (products.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MagnifyingGlassMinus />
          </EmptyMedia>
          <EmptyTitle>Sin resultados</EmptyTitle>
          <EmptyDescription>
            No encontramos productos con esos filtros. Probá quitar alguno.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" render={<Link href="/catalogo" />}>
            Limpiar filtros
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
