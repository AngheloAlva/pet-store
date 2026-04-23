## Exploration: slice-6-polish

### Current State

- **Routes (9)**: `/`, `/blog`, `/carrito`, `/catalogo`, `/cuenta`, `/producto/[slug]`, `/servicios`, `/sucursales`. Four slices have landed real content (`/`, `/catalogo`, `/producto/[slug]`, `/carrito`, `/sucursales`). `/blog`, `/cuenta`, `/servicios` remain stubs.
- **Metadata (root)**: `src/app/layout.tsx` exports rich defaults — `metadataBase: new URL("https://simplepet.cl")`, title template `"%s · SimplePet"`, description, keywords, OG+Twitter card config, theme-color viewport. **Missing**: `openGraph.url`, OG image asset, canonical URL alternates per page.
- **Not-found**: only `src/app/producto/[slug]/not-found.tsx` exists (branded, good). No global `src/app/not-found.tsx`, no global `error.tsx`.
- **Loading states**: none. `src/app/catalogo/page.tsx` is RSC and reads `searchParams` → could benefit from `loading.tsx`. PDP is SSG so `loading.tsx` only covers fresh ISR requests (low benefit for demo but still a quick polish win).
- **SSG**: `/producto/[slug]` has `generateStaticParams` wired in Slice 3. No `revalidate` / `dynamic` set elsewhere — defaults apply.
- **Images**: `<Image>` with correct `sizes` in ProductCard, CartLineItem, and ProductGallery (which also uses `priority` on the first image). HeroSection is image-free (gradient). `remotePatterns` allow `placehold.co` only. No issues detected.
- **Fonts**: Inter + Bricolage Grotesque via `next/font`, `display: "swap"`. Good.
- **Landmarks**: root layout has `<html>` + `<body>` + `<main className="flex-1">` + `<SiteHeader>` (renders `<header>`) + `<SiteFooter>` (renders `<footer>`). No skip link.
- **Sitemap / robots**: nothing. App Router supports file-based `src/app/sitemap.ts` and `src/app/robots.ts` out of the box.
- **Bundle**: MapLibre primitive is heavy but only mounted inside `<StoreLocator>` which is `"use client"` inside `/sucursales`. Not on any other route. Tree-shaking already isolates it. Lazy-loading via `next/dynamic({ ssr: false })` would trade an eager client chunk for a deferred one — marginal benefit for a demo with only the `/sucursales` page consuming it.
- **`src/lib/site.ts`**: exposes `siteConfig.url = "https://simplepet.cl"` — handy for canonical + sitemap + robots.
- **`src/data/products.ts`**: 44 products per Slice 3 archive. Slugs available for sitemap.

### Affected Areas

- `src/app/sitemap.ts` — NEW. Enumerates static routes + all product slugs.
- `src/app/robots.ts` — NEW. Allow-all, point at `/sitemap.xml`.
- `src/app/not-found.tsx` — NEW. Branded global 404, mirrors the style of the product not-found.
- `src/app/error.tsx` — NEW. Client boundary for uncaught runtime errors; offers "Reintentar" and "Ir al inicio".
- `src/app/catalogo/loading.tsx` — NEW. Skeleton grid matching the 12-card layout.
- `src/app/producto/[slug]/loading.tsx` — NEW. Skeleton PDP (gallery + info + sticky CTA shapes).
- `src/app/opengraph-image.tsx` — NEW. Runtime-generated branded OG image using Next's `ImageResponse`. Sets the default OG asset for the site.
- `src/app/layout.tsx` — MODIFIED. Add skip-to-content link, `id="main"` on `<main>`, extend root metadata with `openGraph.url` and `alternates.canonical` on the root.
- `src/app/page.tsx` + other real-content pages — add `alternates.canonical` via each page's metadata export.
- `src/lib/seo.ts` (optional tiny helper) — NEW. `absoluteUrl(path: string)` — `${siteConfig.url}${path}`. Used by sitemap, canonical metadata, and OG.
- `src/components/layout/skeleton-grid.tsx` or co-located shapes — NEW. Reusable skeleton primitives for catalog/PDP loading.

### Approaches

1. **Ship the full "vendible" polish bundle** — sitemap + robots + not-found + error + loading states + skip link + canonical metadata + Next `ImageResponse` OG image.
   - Pros: covers the demo from every public-facing angle (search engines, error resilience, perceived perf, branded OG preview when shared). All in-tree (zero new deps). Follows Next idiomatic file-based conventions.
   - Cons: broadest surface of any slice; several small files to touch; tests for purely structural Next files (sitemap, robots, ImageResponse) need careful framing.
   - Effort: Medium.

2. **SEO + error boundaries only** — drop loading skeletons, drop skip link, keep sitemap/robots/not-found/error/OG image.
   - Pros: tighter scope; keeps test surface small.
   - Cons: leaves perceived-perf and a11y improvements on the table; OG image alone doesn't push the demo forward visibly when browsing; skeletons are the most visible "polish" win.
   - Effort: Low.

3. **A11y + loading polish only** — skip link, landmarks, skeletons, error boundary. Skip SEO.
   - Pros: in-product visible improvements; no external-facing assumptions.
   - Cons: no SEO story for the sales pitch ("check our sitemap / OG preview"); defensible but less marketable.
   - Effort: Low-Medium.

### Recommendation

**Approach 1 — full polish bundle.** This is the last slice; scope it so the demo looks production-ready. Specific decisions:

- **Sitemap**: Next `MetadataRoute.Sitemap` export. Static routes + product `/producto/{slug}` for each of 44 products. `lastModified: new Date()` for all; tweak `changeFrequency` per route family. Test via unit: import the default export and assert entry shape + count.
- **Robots**: Next `MetadataRoute.Robots` export. `rules: { userAgent: "*", allow: "/" }`, `sitemap: absoluteUrl("/sitemap.xml")`, `host: siteConfig.url`. Trivially testable.
- **not-found.tsx (global)**: branded page mirroring `producto/[slug]/not-found.tsx` style — PawPrint icon in a muted circle, title, one-line description, CTA back to `/`. Export `metadata: { title: "Página no encontrada" }`.
- **error.tsx (global)**: `"use client"` boundary. Receives `{ error, reset }`. Shows generic "Algo salió mal" message + two buttons: `reset()` and link to `/`. Log `error.digest` to console. Do NOT leak the error message.
- **loading.tsx — catalog**: renders a grid of 12 `<ProductCardSkeleton>` shapes (plus a filter sidebar skeleton on `md+`). Keep DOM light; use `aria-busy`.
- **loading.tsx — PDP**: two-column shape; left is a square skeleton (gallery), right is a series of line-height bars (title, price, variants, CTA). Sticky CTA shape on mobile.
- **Skip link**: `<a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 ...">Saltar al contenido</a>` as the first focusable element in `<body>`. `<main id="main" tabIndex={-1}>` to accept focus on target.
- **OG image**: `src/app/opengraph-image.tsx` default export returns `ImageResponse` with a 1200×630 branded composition (primary tint background, PawPrint icon, `"SimplePet"` + tagline). Also export `size`, `contentType`, `alt`. Test via unit: importing exports, checking runtime `size.width`/`height`.
- **Canonical URL**:
  - Root layout adds `alternates: { canonical: "/" }` to establish a base.
  - Pages with static metadata (PDP uses dynamic `generateMetadata`) add `alternates: { canonical: "/catalogo" }` etc.
  - PDP's `generateMetadata` already in place; extend it to set `alternates: { canonical: \`/producto/\${slug}\` }`.
- **Small helper `src/lib/seo.ts`** — `absoluteUrl`, `sitemapEntryFor(path)`. Fully testable.

### Risks

- **`ImageResponse` edge runtime**: App Router's `opengraph-image.tsx` runs on the Edge by default; it only allows standard fetch/Node-compatible APIs. Our import surface is tiny (Next's `ImageResponse` + JSX + static strings), so this is fine. Test hook: ensure no Node-specific imports leak.
- **Skip link interactions with existing focus patterns**: Base UI Sheet focus trap in the mobile menu + cart drawer + map popup. Skip link lives OUTSIDE those dialogs, so it's unaffected; a quick smoke test via RTL confirms it focuses correctly.
- **Sitemap test stability**: if `lastModified` uses `new Date()`, equality checks are brittle. Mitigate by asserting `lastModified instanceof Date` and entry count, not exact timestamps.
- **Loading skeletons are structural, not behavioral**: tests should verify the skeleton file exports a React component and renders expected landmark (e.g., `role="status"` with `aria-label="Cargando productos"`). Resist the urge to pixel-test.
- **Canonical paths with trailing slash**: Next doesn't add trailing slashes by default in metadata; standardize on no-trailing-slash in `absoluteUrl`.
- **Global `not-found.tsx` can shadow per-route `not-found.tsx`**: Next's resolution is most-specific-wins. `producto/[slug]/not-found.tsx` still fires for unknown product slugs. Verify in manual QA.
- **Global `error.tsx` must be client**: add `"use client"` at the very top and keep imports minimal (no server-only imports). The page also needs a simple form so `reset` works as a proper button.
- **`<main tabIndex={-1}>`**: accepts focus via anchor jump but doesn't appear in tab order as a focusable node (good).

### Ready for Proposal

**Yes.** Scope is bounded (11 concrete files touched or created + a tiny helper + metadata edits in existing pages), has no new dependencies, fits Next App Router's file-based model, and maps cleanly to testable behavior. Next = `sdd-propose` to formalize scope + capabilities.

### Out of Scope (restated, per orchestrator)

- No new features (search, checkout, wishlist, account, blog content, services page content).
- No dark mode / ThemeProvider.
- No analytics or consent.
- No i18n or internationalized routing.
- No new third-party dependencies.
- No bundle-splitting of the Map primitive via `next/dynamic` (defer; marginal benefit for this single-page consumer).
