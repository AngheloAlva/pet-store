export function ProductCardSkeleton() {
  return (
    <div
      data-slot="product-card-skeleton"
      className="overflow-hidden rounded-lg border border-border bg-background"
    >
      <div className="aspect-square w-full animate-pulse bg-muted" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
