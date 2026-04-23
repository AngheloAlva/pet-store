import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { getCategoryBreadcrumb } from "@/lib/catalog";
import type { Product } from "@/types";

type Props = {
  product: Product;
};

export function ProductBreadcrumb({ product }: Props) {
  const primaryCategoryId = product.categoryIds[0];
  const categoryChain = primaryCategoryId
    ? getCategoryBreadcrumb(primaryCategoryId)
    : [];
  const topLevel = categoryChain[0];

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <li>
          <Link href="/" className="hover:text-foreground">
            Inicio
          </Link>
        </li>
        {topLevel && (
          <>
            <li aria-hidden="true">
              <CaretRight size={12} />
            </li>
            <li>
              <Link
                href={`/catalogo?categoria=${topLevel.slug}`}
                className="hover:text-foreground"
              >
                {topLevel.name}
              </Link>
            </li>
          </>
        )}
        <li aria-hidden="true">
          <CaretRight size={12} />
        </li>
        <li>
          <span aria-current="page" className="font-medium text-foreground">
            {product.name}
          </span>
        </li>
      </ol>
    </nav>
  );
}
