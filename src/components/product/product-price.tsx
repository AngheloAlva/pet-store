import { Badge } from "@/components/ui/badge";
import { formatCLP } from "@/lib/format";
import { calculateDiscountPercent } from "@/lib/pdp";
import type { ProductVariant } from "@/types";

type Props = {
  variant: ProductVariant;
};

export function ProductPrice({ variant }: Props) {
  const discount = calculateDiscountPercent(variant);

  return (
    <div className="flex flex-wrap items-baseline gap-3">
      <span className="text-3xl font-semibold tabular-nums">
        {formatCLP(variant.price.amount)}
      </span>
      {variant.compareAtPrice && (
        <span className="text-base text-muted-foreground line-through tabular-nums">
          {formatCLP(variant.compareAtPrice.amount)}
        </span>
      )}
      {discount !== null && (
        <Badge variant="destructive" className="font-semibold">
          -{discount}%
        </Badge>
      )}
    </div>
  );
}
