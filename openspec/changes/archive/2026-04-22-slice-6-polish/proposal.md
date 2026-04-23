# Proposal: Slice 6 — Polish & Perf

## Intent

Último slice del roadmap. Objetivo: elevar el demo a nivel "vendible" — cuando un prospect abra el sitio, no debería encontrar 404s crudos, pantallas en blanco, previews sin OG, ni falta de sitemap. Cambios concretos y visibles, cero features nuevas.

## Scope

### In Scope
- `sitemap.ts` + `robots.ts` (App Router file-based).
- Global `not-found.tsx` + `error.tsx`.
- Loading skeletons para `/catalogo` y `/producto/[slug]`.
- Skip-to-content link + landmark `<main id="main">`.
- OG image runtime vía `ImageResponse` (1200×630, branded).
- Canonical URL: root + páginas con contenido real; PDP extiende `generateMetadata`.
- Helper puro `src/lib/seo.ts` (`absoluteUrl`).
- `ProductCardSkeleton` component reutilizable.

### Out of Scope
- Features nuevas (checkout, search, wishlist, blog/cuenta/servicios content).
- Dark mode / ThemeProvider.
- Analytics, cookies, consent.
- i18n / routing internacionalizado.
- Dependencias nuevas.
- Bundle-splitting del Map primitive vía `next/dynamic` (se difiere — beneficio marginal para un consumer único).

## Capabilities

### New Capabilities
- `site-polish`: cubre sitemap, robots, global 404/error, loading skeletons, skip link, canonical metadata, OG image, absoluteUrl helper. Son infraestructura del demo que vive junta — separarlas agrega cruft sin valor.

### Modified Capabilities
- None. La extensión de `product-detail` para canonical URL es implementación sin cambio de requirement (el spec ya cubre "Dynamic Metadata").

## Approach

Next App Router file-based primitives hacen casi todo el trabajo:

- `src/app/sitemap.ts` → exporta `MetadataRoute.Sitemap` con rutas estáticas + 44 slugs de producto vía `absoluteUrl`.
- `src/app/robots.ts` → exporta `MetadataRoute.Robots` con allow-all + sitemap URL.
- `src/app/not-found.tsx` → RSC branded con PawPrint + CTA home.
- `src/app/error.tsx` → `"use client"` boundary con `{ error, reset }`; muestra mensaje genérico + botones reset/home. No filtra mensaje del error.
- `src/app/catalogo/loading.tsx` → grid de 12 `<ProductCardSkeleton>` con `role="status"` + `aria-label="Cargando productos"`.
- `src/app/producto/[slug]/loading.tsx` → skeleton PDP (gallery + info + CTA).
- `src/app/opengraph-image.tsx` → default export `ImageResponse` (JSX sobre primary tint + logo + tagline). Exports `size`, `contentType`, `alt`.
- `src/app/layout.tsx` → skip link (primer focusable), `<main id="main" tabIndex={-1}>`, `openGraph.url`, `alternates.canonical: "/"`.
- `src/lib/seo.ts` → `absoluteUrl(path)` usa `siteConfig.url`, normaliza a sin trailing slash.

Strict TDD aplica a helpers puros y a archivos que exportan funciones/constantes testables (sitemap, robots, OG exports). Skeletons y boundary se validan con RTL structural (landmarks, aria).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/seo.ts` | New | `absoluteUrl(path)`. |
| `src/app/sitemap.ts` | New | Rutas estáticas + product slugs. |
| `src/app/robots.ts` | New | Allow-all + sitemap. |
| `src/app/not-found.tsx` | New | Global 404 branded. |
| `src/app/error.tsx` | New | `"use client"` boundary. |
| `src/app/opengraph-image.tsx` | New | ImageResponse 1200×630. |
| `src/app/catalogo/loading.tsx` | New | Skeleton grid. |
| `src/app/producto/[slug]/loading.tsx` | New | Skeleton PDP. |
| `src/components/product/product-card-skeleton.tsx` | New | Reutilizable. |
| `src/app/layout.tsx` | Modified | Skip link + `<main id="main">` + metadata alternates/OG url. |
| `src/app/page.tsx`, `/catalogo`, `/carrito`, `/sucursales` | Modified | `alternates.canonical` en metadata. |
| `src/app/producto/[slug]/page.tsx` | Modified | `generateMetadata` extendido con `alternates.canonical`. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `ImageResponse` edge runtime rompe imports | Low | Keep imports a Next + primitives; no node-only APIs. Test que solo valida exports. |
| Skip link entra en conflicto con focus trap (Sheet/drawer) | Low | Vive fuera de dialogs; el trap no lo captura; RTL test confirma focus. |
| `lastModified: new Date()` hace sitemap test flaky | Med | Assert `instanceof Date` + count, no timestamp exacto. |
| Global not-found shadowing per-route not-found | Low | Next resuelve most-specific-wins; `producto/[slug]/not-found.tsx` sigue firing para slugs inválidos. Manual QA lo confirma. |
| `error.tsx` missing `"use client"` → SSR crash | Med | Directive en línea 1, test de RTL asegura que renderiza sin hydration mismatch. |
| Loading skeletons cambian layout vs contenido real (CLS) | Low | Skeleton shapes respetan alturas/aspect-ratio de su contenido. |

## Rollback Plan

`git revert` del commit del slice. Los archivos nuevos se borran; los modificados vuelven a su estado anterior. Sin migración de datos ni esquemas externos. Crawlers que cachearon el sitemap volverán a ver 404 en `/sitemap.xml` (comportamiento pre-slice).

## Dependencies

- Next 16 file-based metadata conventions (`sitemap.ts`, `robots.ts`, `opengraph-image.tsx`, `not-found.tsx`, `error.tsx`, `loading.tsx`).
- `siteConfig.url` en `src/lib/site.ts` (ya existe).
- `src/data/products.ts` con 44 slugs (ya existe).

## Success Criteria

- [ ] `/sitemap.xml` responde con 200 y entries para rutas + productos.
- [ ] `/robots.txt` apunta al sitemap.
- [ ] Ir a `/noexiste` muestra el 404 branded; `/producto/noexiste` sigue mostrando el 404 específico de producto.
- [ ] Tirar un error simulado dispara `error.tsx`; "Reintentar" re-renderiza.
- [ ] Navegar a `/catalogo` con throttle muestra skeleton antes del contenido.
- [ ] Tab primero en la home revela "Saltar al contenido"; Enter mueve el foco a `<main>`.
- [ ] Compartir URL en Slack/Twitter muestra preview con imagen OG branded.
- [ ] `view-source:/` contiene `<link rel="canonical" href="https://simplepet.cl/" />`.
- [ ] `pnpm test` verde; `pnpm lint` 0 warnings; `pnpm exec tsc --noEmit` 0 errors.
