# Capability: site-polish

**Status**: NEW (introduced by `slice-6-polish`).
**Surface**: Root metadata, sitemap/robots/not-found/error/OG file-based primitives, loading skeletons, `src/lib/seo.ts` helper.

## Requirement 1 — Absolute URL Helper

`src/lib/seo.ts` MUST export `absoluteUrl(path: string): string` that joins the canonical site origin with the given path. The result MUST NOT contain double slashes at the boundary and MUST NOT have a trailing slash (except for the site root which is `{origin}/`).

### Scenario: Root path
- **Given** `absoluteUrl("/")`
- **When** called
- **Then** returns `"https://simplepet.cl/"`

### Scenario: Nested path
- **Given** `absoluteUrl("/producto/pro-plan-adulto")`
- **When** called
- **Then** returns `"https://simplepet.cl/producto/pro-plan-adulto"` (no trailing slash)

### Scenario: Path without leading slash is normalized
- **Given** `absoluteUrl("catalogo")`
- **When** called
- **Then** returns `"https://simplepet.cl/catalogo"` (a single slash is inserted)

### Scenario: Double-slash is collapsed
- **Given** `absoluteUrl("//carrito")` or similar input
- **When** called
- **Then** returns `"https://simplepet.cl/carrito"`

## Requirement 2 — Sitemap

The project MUST expose `/sitemap.xml` via `src/app/sitemap.ts` default export returning a `MetadataRoute.Sitemap` array. The array MUST include every static real-content route and every product detail URL. Entries MUST set `lastModified` to a Date and a `url` produced by `absoluteUrl`.

### Scenario: Static routes included
- **Given** the current site configuration
- **When** the sitemap is evaluated
- **Then** the array contains entries for at least `/`, `/catalogo`, `/carrito`, `/sucursales`

### Scenario: Product entries
- **Given** the seed data with N products
- **When** the sitemap is evaluated
- **Then** the array contains one entry per product with `url` equal to `absoluteUrl("/producto/{slug}")` and N ≥ 40 entries overall

### Scenario: Entry shape
- **Given** any entry in the sitemap
- **When** inspected
- **Then** `lastModified` is an instance of `Date` and `url` starts with the canonical origin

## Requirement 3 — Robots

The project MUST expose `/robots.txt` via `src/app/robots.ts` default export returning a `MetadataRoute.Robots` value. It MUST allow crawling site-wide and point at the sitemap.

### Scenario: Allow-all rule
- **Given** the robots export
- **When** evaluated
- **Then** `rules` includes `{ userAgent: "*", allow: "/" }`

### Scenario: Sitemap reference
- **Given** the robots export
- **When** evaluated
- **Then** `sitemap` equals `absoluteUrl("/sitemap.xml")`

### Scenario: Host
- **Given** the robots export
- **When** evaluated
- **Then** `host` equals the canonical origin from `siteConfig.url`

## Requirement 4 — Global Not-Found

`src/app/not-found.tsx` MUST render a branded 404 page with a heading, a short Spanish description, and a primary CTA linking to `/`. It MUST export metadata with `title: "Página no encontrada"`.

### Scenario: Renders heading and home CTA
- **Given** the user navigates to an unknown path at the site root (e.g. `/xyz-no-existe`)
- **When** the page renders
- **Then** the output contains a heading "Página no encontrada" and a link with `href="/"` whose accessible name mentions "Inicio"

### Scenario: Per-route not-found still wins
- **Given** a path `/producto/slug-invalido` where `producto/[slug]/not-found.tsx` exists
- **When** the user navigates
- **Then** the product-specific not-found page is rendered (NOT the global one)

## Requirement 5 — Global Error Boundary

`src/app/error.tsx` MUST be a `"use client"` component accepting `{ error, reset }`. It MUST render a user-safe Spanish message, a "Reintentar" button wired to `reset`, and a link to `/`. It MUST NOT render the raw `error.message` or `stack` in the DOM.

### Scenario: Renders generic message
- **Given** the boundary receives an `Error` with message "SECRET"
- **When** rendered
- **Then** the DOM contains a generic "Algo salió mal" text and does NOT contain the string "SECRET"

### Scenario: Reintentar calls reset
- **Given** the boundary is rendered with a `reset` mock
- **When** the user clicks the "Reintentar" button
- **Then** `reset` is called exactly once

### Scenario: Home link present
- **Given** the boundary is rendered
- **When** inspected
- **Then** there is a link with `href="/"`

## Requirement 6 — Catalog Loading Skeleton

`src/app/catalogo/loading.tsx` MUST render a status region with `role="status"` and `aria-label="Cargando productos"` and exactly 12 skeleton cards.

### Scenario: Role and label
- **Given** the loading component renders
- **When** inspected
- **Then** an element with `role="status"` exists with `aria-label="Cargando productos"`

### Scenario: Twelve cards
- **Given** the loading component renders
- **When** the number of `ProductCardSkeleton` elements is counted
- **Then** it equals 12

## Requirement 7 — PDP Loading Skeleton

`src/app/producto/[slug]/loading.tsx` MUST render a two-column shape: a square gallery placeholder and a stacked info region (title, price, CTA). It MUST expose `role="status"` with `aria-label="Cargando producto"`.

### Scenario: Role and label
- **Given** the loading component renders
- **When** inspected
- **Then** an element with `role="status"` and `aria-label="Cargando producto"` exists

### Scenario: Has gallery and info placeholders
- **Given** the loading component renders
- **When** inspected
- **Then** the DOM contains at least one square aspect placeholder and at least one line-height placeholder under the same status container

## Requirement 8 — Skip Link and Main Landmark

The root layout MUST render a skip-to-content link as the first focusable element inside `<body>` that is visually hidden until focused. The `<main>` element MUST have `id="main"` and `tabIndex={-1}` so the skip link can move focus.

### Scenario: Skip link exists
- **Given** the root layout renders
- **When** a tab press reaches the first focusable element
- **Then** that element is a link with `href="#main"` and an accessible name containing "Saltar al contenido"

### Scenario: Main landmark
- **Given** the root layout renders
- **When** inspected
- **Then** the `<main>` element has `id="main"` and `tabindex="-1"`

## Requirement 9 — OG Image

`src/app/opengraph-image.tsx` MUST default-export a function returning an `ImageResponse` with a branded 1200×630 composition (brand name, tagline, accent color). The file MUST export `size` `{ width: 1200, height: 630 }`, `contentType: "image/png"`, and `alt` with a Spanish description.

### Scenario: Exports metadata
- **Given** the module is imported
- **When** `size`, `contentType`, `alt` are read
- **Then** they equal `{ width: 1200, height: 630 }`, `"image/png"`, and a non-empty string respectively

### Scenario: Default export is a function
- **Given** the module is imported
- **When** the default export is evaluated
- **Then** it is a function (invocation returns an `ImageResponse` at runtime)

## Requirement 10 — Canonical URLs

The root layout metadata MUST include `openGraph.url` set to `absoluteUrl("/")` and `alternates.canonical` set to `"/"`. Real-content page metadata (`/`, `/catalogo`, `/carrito`, `/sucursales`) MUST set `alternates.canonical` to their respective absolute path. The product detail `generateMetadata` MUST set `alternates.canonical` to `"/producto/{slug}"`.

### Scenario: Root canonical
- **Given** root metadata is evaluated
- **When** inspected
- **Then** `alternates.canonical === "/"` and `openGraph.url === absoluteUrl("/")`

### Scenario: Catalog canonical
- **Given** `/catalogo` page metadata is evaluated
- **When** inspected
- **Then** `alternates.canonical === "/catalogo"`

### Scenario: Product canonical
- **Given** `generateMetadata({ params: { slug: "pro-plan-adulto" } })` is awaited
- **When** the returned metadata is inspected
- **Then** `alternates.canonical === "/producto/pro-plan-adulto"`
