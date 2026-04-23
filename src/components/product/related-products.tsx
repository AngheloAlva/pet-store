import { getRelatedProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/types";

type Props = {
  product: Product;
  limit?: number;
};

export function RelatedProducts({ product, limit = 4 }: Props) {
  const related = getRelatedProducts(product, limit);
  if (related.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="font-heading text-2xl font-semibold tracking-tight">
        También te puede gustar
      </h2>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {related.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
