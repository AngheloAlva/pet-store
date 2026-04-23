import { Container } from "@/components/layout/container";

export default function Loading() {
  return (
    <Container className="py-8">
      <div
        role="status"
        aria-label="Cargando producto"
        className="grid gap-8 md:grid-cols-[1.2fr_1fr]"
      >
        <div className="aspect-square w-full animate-pulse rounded-lg bg-muted" />
        <div className="space-y-3">
          <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-6 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </div>
        <span className="sr-only">Cargando…</span>
      </div>
    </Container>
  );
}
