import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/product/product-card";
import { getFeaturedProducts } from "@/lib/catalog";

export function PopularProducts() {
  const products = getFeaturedProducts();
  if (products.length === 0) return null;

  return (
    <section className="border-t border-border bg-muted/30 py-16">
      <Container>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-3xl font-semibold tracking-tight">
              Lo más vendido
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Los favoritos de la comunidad SimplePet.
            </p>
          </div>
          <Link
            href="/catalogo"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Ver todos
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </Container>
    </section>
  );
}
