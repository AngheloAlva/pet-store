import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCLP } from "@/lib/format";
import { getBrand, getMinPrice, getTagMeta } from "@/lib/catalog";
import type { Product } from "@/types";

type ProductCardProps = {
  product: Product;
  priority?: boolean;
};

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const brand = getBrand(product.brandId);
  const minPrice = getMinPrice(product);
  const hasMultipleVariants = product.variants.length > 1;
  const primary = product.variants[0];
  const hasSale = Boolean(primary.compareAtPrice);
  const primaryTag = product.tags[0];
  const tagMeta = primaryTag ? getTagMeta(primaryTag) : null;
  const image = product.images[0];

  return (
    <Card className="group overflow-hidden py-0 gap-0 transition-shadow hover:shadow-md">
      <Link href={`/producto/${product.slug}`} className="block">
        <div className="relative aspect-square bg-muted">
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={priority}
          />
          {tagMeta && (
            <Badge
              variant={tagMeta.tone}
              className="absolute top-2 left-2 shadow-sm"
            >
              {tagMeta.label}
            </Badge>
          )}
        </div>
      </Link>

      <CardContent className="flex flex-col gap-1 p-4">
        {brand && (
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {brand.name}
          </p>
        )}
        <Link
          href={`/producto/${product.slug}`}
          className="text-sm font-medium leading-snug line-clamp-2 hover:text-primary"
        >
          {product.name}
        </Link>

        <div className="mt-2 flex items-baseline gap-2">
          {hasMultipleVariants && (
            <span className="text-xs text-muted-foreground">Desde</span>
          )}
          <span className="text-base font-semibold tabular-nums">
            {formatCLP(minPrice)}
          </span>
          {hasSale && !hasMultipleVariants && primary.compareAtPrice && (
            <span className="text-xs text-muted-foreground line-through tabular-nums">
              {formatCLP(primary.compareAtPrice.amount)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
