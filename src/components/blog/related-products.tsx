import Link from "next/link";
import type { PublicProduct } from "@/lib/blog";

interface RelatedProductsProps {
  products: PublicProduct[];
}

export function RelatedProducts({ products }: RelatedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold text-foreground mb-4">Productos relacionados</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/producto/${product.slug}`}
            className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
          >
            <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {product.name}
            </h3>
            {product.shortDescription && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {product.shortDescription}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
