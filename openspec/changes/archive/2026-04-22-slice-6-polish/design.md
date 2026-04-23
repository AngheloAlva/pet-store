# Design: slice-6-polish

## Decisions

### 1. Single capability `site-polish`, not three

Sitemap/robots/OG (SEO), 404/error (resilience), and loading skeletons (perceived perf) are three concerns but live in the same file-based Next App Router conventions and share the same testing surface (structural RTL + pure unit). Splitting into three capabilities creates organizational cruft with no behavioral benefit. One capability with 10 requirements is clearer.

### 2. `src/lib/seo.ts` — `absoluteUrl`

```ts
import { siteConfig } from "./site";

export function absoluteUrl(path: string): string {
  const origin = siteConfig.url.replace(/\/+$/, "");
  if (!path) return `${origin}/`;
  // Collapse leading slashes and strip trailing slash (except for root "/")
  const trimmed = path.replace(/^\/+/, "");
  if (trimmed === "") return `${origin}/`;
  const withoutTrailing = trimmed.replace(/\/+$/, "");
  return `${origin}/${withoutTrailing}`;
}
```

Pure, fully testable. Used by sitemap, robots, canonical metadata, and OG image URL (optional).

### 3. `src/app/sitemap.ts` — enumerate via data layer

```ts
import type { MetadataRoute } from "next";
import { products } from "@/data";
import { absoluteUrl } from "@/lib/seo";

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/",           changeFrequency: "weekly",  priority: 1.0 },
  { path: "/catalogo",   changeFrequency: "daily",   priority: 0.9 },
  { path: "/sucursales", changeFrequency: "monthly", priority: 0.6 },
  { path: "/carrito",    changeFrequency: "yearly",  priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticEntries = STATIC_ROUTES.map((r) => ({
    url: absoluteUrl(r.path),
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
  const productEntries = products.map((p) => ({
    url: absoluteUrl(`/producto/${p.slug}`),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
  return [...staticEntries, ...productEntries];
}
```

Do NOT include `/blog`, `/cuenta`, `/servicios` — they're stubs; indexing them is a poor demo signal.

### 4. `src/app/robots.ts`

```ts
import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteConfig.url,
  };
}
```

Tests import the default, assert shape.

### 5. `src/app/not-found.tsx` — RSC

Static, no hooks. Use the already-proven pattern from `producto/[slug]/not-found.tsx`. Export `metadata: { title: "Página no encontrada" }`. CTA uses `<Button render={<Link href="/" />}>Ir al inicio</Button>`.

### 6. `src/app/error.tsx` — client boundary

```tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Optional: log to console so devs can see in the terminal / browser
  console.error("Global error boundary:", error.digest);

  return (
    <Container className="py-24">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Algo salió mal
        </h1>
        <p className="mt-2 text-muted-foreground">
          Tuvimos un problema inesperado al cargar esta página. Probá de nuevo
          o volvé al inicio.
        </p>
        <div className="mt-6 flex gap-2">
          <Button onClick={() => reset()}>Reintentar</Button>
          <Button variant="outline" render={<Link href="/" />}>
            Ir al inicio
          </Button>
        </div>
      </div>
    </Container>
  );
}
```

The DOM never contains `error.message` or `error.stack`. Test asserts a secret payload doesn't appear.

### 7. Skeletons

**`src/components/product/product-card-skeleton.tsx`** — reusable. Mirrors `ProductCard` shape: square aspect div + three line-height bars (brand, name, price). All `bg-muted` + `animate-pulse`.

```tsx
export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="aspect-square w-full animate-pulse bg-muted" />
      <div className="p-4 space-y-2">
        <div className="h-3 w-16 rounded bg-muted animate-pulse" />
        <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
        <div className="h-4 w-1/3 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}
```

**`src/app/catalogo/loading.tsx`** — Container + grid of 12.

```tsx
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
```

**`src/app/producto/[slug]/loading.tsx`** — gallery + info column skeleton. Two blocks under a shared status container.

```tsx
import { Container } from "@/components/layout/container";

export default function Loading() {
  return (
    <Container className="py-8">
      <div
        role="status"
        aria-label="Cargando producto"
        className="grid gap-8 md:grid-cols-[1.2fr_1fr]"
      >
        <div className="aspect-square w-full rounded-lg bg-muted animate-pulse" />
        <div className="space-y-3">
          <div className="h-8 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
          <div className="h-6 w-1/3 rounded bg-muted animate-pulse" />
          <div className="h-10 w-full rounded bg-muted animate-pulse" />
          <div className="h-10 w-full rounded bg-muted animate-pulse" />
        </div>
        <span className="sr-only">Cargando…</span>
      </div>
    </Container>
  );
}
```

### 8. Skip link + main landmark

Edit `src/app/layout.tsx`. Insert skip link AS THE FIRST CHILD of `<body>`:

```tsx
<body ...>
  <a
    href="#main"
    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
  >
    Saltar al contenido
  </a>
  <SiteHeader />
  <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">{children}</main>
  ...
</body>
```

`tabIndex={-1}` + matching `id` make `href="#main"` move focus on anchor navigation (Safari requires `tabIndex` for programmatic focus).

### 9. OG image

`src/app/opengraph-image.tsx`:

```tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "SimplePet — Todo para tu mascota en un solo lugar";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%)",
          color: "#134e4a",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            marginBottom: 24,
            display: "flex",
          }}
        >
          SimplePet
        </div>
        <div
          style={{
            fontSize: 40,
            color: "#374151",
            display: "flex",
            textAlign: "center",
          }}
        >
          Todo para tu mascota en un solo lugar
        </div>
      </div>
    ),
    size,
  );
}
```

Keep it simple: no external fonts (Edge Font constraints), no network fetch. The ImageResponse default ships with a system font fallback.

### 10. Canonical URLs per page

- **Root layout** `metadata`:

  ```ts
  openGraph: { ..., url: absoluteUrl("/") },
  alternates: { canonical: "/" },
  ```

- **`/` page** (`src/app/page.tsx`): add `export const metadata: Metadata = { alternates: { canonical: "/" } }` — redundant with root but explicit; per-page beats inherited in Next.
- **`/catalogo`, `/carrito`, `/sucursales`**: same, with their path.
- **`/producto/[slug]` `generateMetadata`**: extend the existing function to return `alternates: { canonical: \`/producto/\${slug}\` }` alongside the current title/description.

### 11. Testing approach (Strict TDD)

| File | Test style |
|------|-----------|
| `src/lib/seo.test.ts` | Pure unit: 4 scenarios for `absoluteUrl`. |
| `src/app/sitemap.test.ts` | Import default, assert entry count ≥ 4 static + N products; every entry has `lastModified instanceof Date` and `url.startsWith(siteConfig.url)`; a specific product slug appears. |
| `src/app/robots.test.ts` | Import default, assert `rules`, `sitemap`, `host`. |
| `src/app/not-found.test.tsx` | RTL renders heading + home link. |
| `src/app/error.test.tsx` | RTL renders generic message, calls `reset` on click, does not leak error.message. |
| `src/app/catalogo/loading.test.tsx` | RTL: `role="status"` + `aria-label="Cargando productos"` + 12 skeleton cards (count by selector `[data-slot="product-card-skeleton"]` added to the skeleton component). |
| `src/app/producto/[slug]/loading.test.tsx` | Same pattern: role/label + presence of gallery placeholder + info placeholders. |
| `src/app/opengraph-image.test.tsx` | Import the module, assert `size`, `contentType`, `alt`; assert `typeof default === "function"`. Do NOT invoke at test time (edge runtime not available in vitest). |
| `src/components/product/product-card-skeleton.test.tsx` | Renders a container with `data-slot="product-card-skeleton"` and four shape divs. |
| `src/app/layout.test.tsx` (optional) | Skip: root layout tests in Next are awkward. We verify skip link + main landmark via a smaller focused test that renders the layout children or verifies presence via integration through another route test. **Decision**: test the skip link render and `<main id="main">` by rendering `<RootLayout>{<p>x</p>}</RootLayout>` in RTL, asserting first focusable element is the skip link by tabbing. |

### 12. `data-slot` on skeletons

Add `data-slot="product-card-skeleton"` to the root of `ProductCardSkeleton`. Makes the catalog loading test count unambiguous (querying by class is brittle across Tailwind refactors).

### 13. Edge runtime marker

`opengraph-image.tsx` exports `runtime = "edge"`. This is a Next primitive; Vitest won't attempt to execute it. The test only imports and asserts exports.

### 14. What NOT to test

- Do not try to execute the `opengraph-image` default export — `ImageResponse` requires Edge runtime.
- Do not assert exact `lastModified` timestamps — flaky across runs.
- Do not assert exact Tailwind class names — brittle.
- Do not snapshot full DOM — noisy.

### 15. Out-of-scope guardrails

- No `Suspense` fallbacks at layout level — file-based `loading.tsx` is enough.
- No `<Script>` tags for analytics.
- No additional metadata beyond canonical + OG url.
- No refactors to `SiteHeader` / `SiteFooter` — their landmarks already exist.

## Open Questions

None.

## Migration / Rollback

`git revert` of the slice commit fully reverts. Search engines that cached `/sitemap.xml` before the commit keep working post-revert (404 returns). Users don't see any behavior change beyond the removal of the polish surfaces.
