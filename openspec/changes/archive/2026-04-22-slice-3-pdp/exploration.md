# Exploration: slice-3-pdp

## Current State

`/producto/[slug]/page.tsx` exists as a stub that renders the slug as the page title (from Slice 0). All the data and primitives we need are already in place:

- **Product type** (`src/types/product.ts`) — has `slug`, `images[]`, `variants[]` (each with `id`, `sku`, `name`, `quantity`, `price`, `compareAtPrice?`, `barcode?`), `tags[]`, `lifeStage?`, `targetSize?`, `species[]`, `categoryIds[]`, `brandId`, `description`, `shortDescription?`, `ingredients?`, `nutritionalAnalysis?`, `featured?`.
- **Stock model** — `StockLevel = { variantId, storeId, status: "in_stock" | "low_stock" | "out_of_stock" }`. Default is `in_stock`; exceptions listed in `src/data/stock.ts`. `getStockLevel(variantId, storeId)` returns the merged level.
- **Stores** (`src/data/stores.ts`) — 4 sucursales with `services`, schedule, coordinates.
- **Cart store** (`src/stores/cart.ts`) — `addItem({ productId, variantId, name, variantName, image, unitPrice, slug }, quantity)` already deduplicates lines by `(productId, variantId)`.
- **ProductCard** — reusable, already used in home and catalog. Perfect for the "related products" section.
- **Catalog port** (`src/lib/catalog.ts`) — has `getBrand`, `getMinPrice`, `getTagMeta`, and the product list. Missing helpers for PDP: resolve product by slug, resolve category chain for breadcrumb, compute related products.
- **Phosphor icons** in `/dist/ssr` for RSC, plain for client.
- **Testing** — Strict TDD is live. Vitest + @testing-library/react + @testing-library/jest-dom installed, 22 green tests exist. `pnpm test`, `pnpm test:watch`, `pnpm test:coverage`.
- **Breadcrumb primitive** exists at `src/components/ui/breadcrumb.tsx` (shadcn Base UI).
- **Tabs primitive** exists (`src/components/ui/tabs.tsx`) — useful for description / ingredients / nutrition panels.

## Affected Areas

- `src/app/producto/[slug]/page.tsx` — replace stub with real PDP (RSC + `generateStaticParams` + dynamic `generateMetadata`).
- `src/lib/catalog.ts` — add `getProductBySlug(slug)`, `getRelatedProducts(product, limit)`, `getCategoryById(id)`, `getCategoryBreadcrumb(categoryId)`.
- `src/lib/stock.ts` (NEW) — add `getProductStockByStore(product)` → per-variant × per-store matrix aggregated or per-variant stock-across-stores; keeps stock-read logic out of the component.
- `src/components/product/` (NEW files):
  - `product-gallery.tsx` — client, main image + thumbnails; handles 1-N images.
  - `product-variants.tsx` — client, variant selector (ButtonGroup or Select); source of truth for "selected variant id".
  - `product-price.tsx` — RSC; receives variant; renders price + compareAtPrice strike + discount % badge.
  - `product-stock.tsx` — RSC or plain; lists stores and their stock status per selected variant. (Must be client if tied to selected variant — see Approaches.)
  - `add-to-cart.tsx` — client, quantity selector + add button wired to Zustand.
  - `product-info-tabs.tsx` — RSC or client wrapper of shadcn Tabs with description / ingredients / nutrition panels.
  - `product-breadcrumb.tsx` — RSC.
  - `related-products.tsx` — RSC, reuses `ProductCard`.
  - `product-purchase-panel.tsx` — client orchestrator that owns the `selectedVariantId` state and composes variants + price + stock + add-to-cart with a single `useState`.
  - `mobile-sticky-cta.tsx` — client; fixed bottom bar on mobile with price + "Agregar".
- Tests alongside each new module.

## Approaches

### 1. Single large client component for the purchase panel

One `<ProductPurchasePanel />` that owns selected variant id, quantity, and renders variants + price + stock + CTA as a single client tree.

- **Pros**: Zero prop drilling; state lives in one place; tests are easier (mount one component).
- **Cons**: Everything inside becomes client — the variant-by-variant stock list, the formatted price, and the discount badge all ship to the browser even though they're derivable from data.
- **Effort**: Low.

### 2. Split: RSC shell + client islands around selected variant

PDP page (RSC) renders everything it can server-side (gallery wrapper, breadcrumb, description, related, stock matrix, tabs). One client island (`<ProductPurchasePanel />`) owns `selectedVariantId` state and renders variant selector + price + add-to-cart. Stock list becomes a client component that *subscribes* to the selected variant via a shared store or a React Context.

- **Pros**: Minimum JS for the user; price formatting, image alt text, breadcrumb, description stay server-rendered.
- **Cons**: Need a mechanism to share `selectedVariantId` with the stock list. Context or a per-PDP Zustand store adds complexity.
- **Effort**: Medium.

### 3. Hybrid — client orchestrator renders variants + price + stock + CTA, everything else RSC

PDP page is RSC. One client orchestrator (`<ProductPurchasePanel />`) is a single client tree that houses the interactive parts (variants, price, stock list, quantity, add-to-cart). Non-interactive parts (gallery, tabs, breadcrumb, related) stay RSC siblings of the panel.

- **Pros**: Clean separation, no Context or per-PDP store needed; state is colocated; RSC wins where it matters (text + images + related). Testing: mount the orchestrator with a product prop, no router needed. Gallery can still be its own small client island because thumbnails need click handlers.
- **Cons**: The panel is ~200 lines; needs a plan for "which pieces live inside the panel vs outside".
- **Effort**: Medium — but the highest quality/weight ratio.

### Gallery: single vs multiple images

Seed data has `images: [{ url, alt }, ...]` where most products have only one image. Need to handle:
- 1 image → static hero, no thumbnails.
- 2+ → hero with thumbnail strip. Click thumbnail → swaps hero (client state).

No need for embla-carousel complexity; a simple `useState<number>` index with keyboard support is enough.

### Variant selector UI

- **Option A — `ToggleGroup`** (shadcn `toggle-group.tsx`): visually clear "pills" of variant names (e.g. "3 kg", "8 kg", "15 kg"). Best for food-style SKUs.
- **Option B — `Select`**: compact dropdown. Worse for quickly scanning price differences.
- **Option C — `RadioGroup` with custom labels**: verbose.

Recommendation: `ToggleGroup` for 2–6 variants. If a product had 10+ variants we'd fall back to Select, but seed tops out at 3.

### Stock display

Per spec brief: "stock-by-sucursal availability". For each store, render the status for the currently selected variant. Icon + label + color:
- 🟢 "Disponible" (in_stock) — primary/success tone.
- 🟡 "Últimas unidades" (low_stock) — amber tone.
- 🔴 "Sin stock" (out_of_stock) — muted + destructive text.

Keep `getStockLevel` as the single source. Add `getProductStockMatrix(variantId)` → `{ storeId, status }[]` in `src/lib/stock.ts` to isolate the lookup.

### Add-to-cart flow

Click "Agregar al carrito" → call `useCartStore.addItem({ productId, variantId, name, variantName, image, unitPrice, slug }, quantity)` → show toast via shadcn `sonner`. Quantity selector: stepper with `-`/`+`, min 1, max 99.

### Related products algorithm

Same top-level species + category if possible; fallback to same brand. Exclude the current product. Limit to 4.

### Metadata & static params

- `generateStaticParams()` → `products.map(p => ({ slug: p.slug }))` — at build time, all 44 PDPs are SSG.
- `generateMetadata({ params })` → `await params`, look up product, return `{ title: name, description: shortDescription ?? description.slice(0,160), openGraph: { images: [image.url] } }`. Handle missing product → 404 metadata.

### Not-found handling

If `getProductBySlug` returns undefined, call Next's `notFound()` from `next/navigation`. Add a simple `src/app/producto/[slug]/not-found.tsx`.

## Recommendation

**Approach 3 — Hybrid with a client orchestrator**.

- `/producto/[slug]/page.tsx` is RSC. Awaits `params`, resolves the product, calls `notFound()` if missing, and returns a layout with: `<Breadcrumb />` (RSC), `<ProductGallery />` (client, needs thumbnail clicks), `<ProductPurchasePanel product={...} />` (client orchestrator: variants, price, stock-by-store, quantity, add-to-cart, sticky mobile CTA), `<ProductInfoTabs />` (RSC wrapper of Tabs with description/ingredients/nutrition), `<RelatedProducts />` (RSC, reuses ProductCard).
- State inside the panel is a single `useState<string>` for `selectedVariantId` + `useState<number>` for `quantity`. No Context, no extra store.
- `src/lib/stock.ts` extracts stock-reading logic behind a thin port: `getProductStockMatrix(variantId): { store, status }[]`.
- TDD-first: start with `catalog.ts` helpers (`getProductBySlug`, `getRelatedProducts`, `getCategoryBreadcrumb`), then `stock.ts`, then the panel's pure logic (`canAddToCart`, `calculateDiscountPercent`, `findVariantById`), then components.

### URL-level integration

- Deep link `/producto/royal-canin-medium-adult?variant=rc-ma-8` → panel reads `?variant=` on mount and pre-selects. Nice-to-have, out of scope if it complicates TDD; leave as follow-up unless spec demands it.

## Risks

- **`params` is async in Next 16**: `generateMetadata` and `Page` both need `await params`. `generateStaticParams` returns sync array.
- **`notFound()` in RSC**: invoking this AFTER rendering any partial UI throws — must call it before render.
- **Hydration of gallery state**: selecting a thumbnail should not fight with SSR image. Use `useState` initial from prop, keep image `priority` on the first one only.
- **Add-to-cart during SSR**: Zustand's `persist` middleware hydrates on client. `addItem` must only be called in event handlers (already true). Tests for the panel must mock the store or use a real one and reset between tests.
- **TDD for visual components**: component behavior (variant click → price updates, add-to-cart fires store.addItem with right payload, stock indicator reflects selected variant) is perfectly testable via `@testing-library/react` + `userEvent`. Pure snapshot-only coverage is low-value; focus on behavior.
- **Image host**: all seed images are `placehold.co`; already whitelisted. Real images later will need their domain added.
- **Accessibility**: variant toggle group needs proper `aria-label`, quantity buttons need labels, breadcrumb needs `aria-label="Breadcrumb"`, main image needs alt from seed.
- **Shared image across variants**: the current data model has images on the product, not the variant. PDP shows `product.images[0]` regardless of selected variant — acceptable for now, note it for a future spec.
- **Sticky mobile CTA double-renders the price**: show price once (primary panel) on mobile when the sticky CTA is visible to avoid duplicated UI — or render the panel's price normally and hide it when the sticky CTA is in view (IntersectionObserver). Keep it simple: always show primary price; sticky CTA repeats it. Duplication is intentional for reach-for-thumb UX.

## Ready for Proposal

Yes. Architecture: RSC page + one client orchestrator (`ProductPurchasePanel`) + a small gallery client island + shared RSC siblings (breadcrumb, tabs, related). New helpers: `getProductBySlug`, `getRelatedProducts`, `getCategoryBreadcrumb`, `getProductStockMatrix`. Strict TDD guides order: helpers first, then panel pure logic, then components.
