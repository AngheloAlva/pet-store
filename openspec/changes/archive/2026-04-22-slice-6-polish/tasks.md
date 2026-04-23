# Tasks: slice-6-polish

**Mode**: Strict TDD — every pair is RED (failing test first) → GREEN (minimal impl).

## Phase 1 — Pure helper (2 tasks)

- [x] 1.1 RED: `src/lib/seo.test.ts` — `absoluteUrl("/")`, nested, no leading slash, double slash collapse.
- [x] 1.2 GREEN: `src/lib/seo.ts` — `absoluteUrl` implementation.

## Phase 2 — Sitemap + robots (4 tasks)

- [x] 2.1 RED: `src/app/sitemap.test.ts` — default export callable; result includes entries for `/`, `/catalogo`, `/sucursales`, `/carrito`; contains ≥ 40 product entries; every entry has `lastModified instanceof Date` and `url.startsWith(siteConfig.url)`; assert a specific product slug appears (e.g. `pro-plan-adulto` or first from seed).
- [x] 2.2 GREEN: `src/app/sitemap.ts`.
- [x] 2.3 RED: `src/app/robots.test.ts` — default export callable; `rules[0] === { userAgent: "*", allow: "/" }`; `sitemap === absoluteUrl("/sitemap.xml")`; `host === siteConfig.url`.
- [x] 2.4 GREEN: `src/app/robots.ts`.

## Phase 3 — Global not-found + error (4 tasks)

- [x] 3.1 RED: `src/app/not-found.test.tsx` — renders heading "Página no encontrada"; home link with `href="/"` and accessible name mentioning "Inicio".
- [x] 3.2 GREEN: `src/app/not-found.tsx` + `metadata` export.
- [x] 3.3 RED: `src/app/error.test.tsx` — renders generic Spanish message; does NOT include the secret error.message (e.g., "SECRET_TOKEN_12345"); "Reintentar" button calls reset mock exactly once; home link with `href="/"`.
- [x] 3.4 GREEN: `src/app/error.tsx` as `"use client"` boundary.

## Phase 4 — Skeletons (6 tasks)

- [x] 4.1 RED: `src/components/product/product-card-skeleton.test.tsx` — renders a root element with `data-slot="product-card-skeleton"`; contains at least 4 placeholder divs.
- [x] 4.2 GREEN: `src/components/product/product-card-skeleton.tsx`.
- [x] 4.3 RED: `src/app/catalogo/loading.test.tsx` — renders `role="status"` with `aria-label="Cargando productos"`; the container holds exactly 12 `[data-slot="product-card-skeleton"]` elements.
- [x] 4.4 GREEN: `src/app/catalogo/loading.tsx`.
- [x] 4.5 RED: `src/app/producto/[slug]/loading.test.tsx` — renders `role="status"` with `aria-label="Cargando producto"`; contains at least one element with `aspect-square` class (gallery placeholder) and at least one line-height placeholder (`.animate-pulse` count ≥ 4).
- [x] 4.6 GREEN: `src/app/producto/[slug]/loading.tsx`.

## Phase 5 — Skip link + main (2 tasks)

- [x] 5.1 RED: `src/app/layout.test.tsx` — rendering `<RootLayout>{child}</RootLayout>` exposes a link whose accessible name matches `/Saltar al contenido/i` with `href="#main"` as the first focusable element; the `<main>` element has `id="main"` and `tabindex="-1"`.
- [x] 5.2 GREEN: modify `src/app/layout.tsx` — prepend skip link in `<body>`, add `id="main" tabIndex={-1}` on `<main>`.

## Phase 6 — OG image (2 tasks)

- [x] 6.1 RED: `src/app/opengraph-image.test.tsx` — imports module; asserts named exports `size` = `{width:1200,height:630}`, `contentType` = `"image/png"`, `alt` non-empty string; `typeof default === "function"`. Do NOT call default (Edge runtime).
- [x] 6.2 GREEN: `src/app/opengraph-image.tsx` with `runtime = "edge"`, `size`, `contentType`, `alt`, `default export`.

## Phase 7 — Canonical URLs (6 tasks)

- [x] 7.1 Update `src/app/layout.tsx` metadata — add `alternates.canonical: "/"` and `openGraph.url: absoluteUrl("/")`. No dedicated test (covered by tsc + page tests below).
- [x] 7.2 RED: `src/app/page.test.tsx` — not needed if existing tests cover; alternatively, add a small test importing `metadata` from `src/app/page.tsx` and asserting `alternates.canonical === "/"`.
- [x] 7.3 GREEN: add `metadata` export to `src/app/page.tsx`.
- [x] 7.4 Add `metadata` exports with `alternates.canonical` to `/catalogo`, `/carrito`, `/sucursales` pages. Verify with small unit tests that import the metadata constant.
- [x] 7.5 RED: extend `src/app/producto/[slug]/page.test.ts` — awaiting `generateMetadata({ params: Promise.resolve({ slug: "pro-plan-adulto" }) })` returns `alternates.canonical === "/producto/pro-plan-adulto"`.
- [x] 7.6 GREEN: update `generateMetadata` in `src/app/producto/[slug]/page.tsx` to include `alternates.canonical`.

## Phase 8 — Final gates (2 tasks)

- [x] 8.1 Run `pnpm test` — all green.
- [x] 8.2 Run `pnpm lint` + `pnpm exec tsc --noEmit` — 0 warnings, 0 errors.

## Gates

- `pnpm test` all green.
- `pnpm lint` 0 warnings.
- `pnpm exec tsc --noEmit` 0 errors.

## Totals
- 28 discrete tasks across 8 phases.
- ~11 test files.
- ~8 new files, ~6 modified files.
