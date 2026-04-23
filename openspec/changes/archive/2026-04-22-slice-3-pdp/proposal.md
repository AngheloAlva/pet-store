# Proposal: Slice 3 — Product Detail Page

## Intent

`/catalogo` (Slice 2) sends users to `/producto/[slug]`, but the route is still a stub. Without a real PDP there is no "add to cart" flow, no stock visibility per sucursal, and no way to prove the demo drives a purchase intent. This slice closes the core loop from browse → select variant → add to cart, and it also introduces SSG over the 44 seed products so the demo feels instant and has real canonical URLs.

## Scope

### In Scope

- `/producto/[slug]` as RSC with `generateStaticParams` (all slugs pre-rendered at build) and dynamic `generateMetadata`.
- `notFound()` + dedicated `not-found.tsx` for unknown slugs.
- `<ProductGallery />` (client) with hero + optional thumbnails.
- `<ProductPurchasePanel />` (client orchestrator): variant `ToggleGroup`, price/compareAt + discount %, stock matrix per sucursal for selected variant, quantity stepper (1-99), add-to-cart wired to Zustand with sonner toast.
- `<ProductInfoTabs />` (RSC) with description / ingredients / nutrition panels.
- `<ProductBreadcrumb />` (RSC): Home > top-level category > product.
- `<RelatedProducts />` (RSC) reusing `ProductCard`, max 4, same category or species, fallback brand.
- Mobile sticky CTA with price + "Agregar".
- New helpers: `getProductBySlug`, `getRelatedProducts`, `getCategoryBreadcrumb`, `getProductStockMatrix`.
- Full TDD coverage: helpers, pure logic, panel behavior.

### Out of Scope

- Variant selection via `?variant=` query param — deferred to follow-up.
- Per-variant images — data model has product-level images only; note for future spec.
- Reviews, ratings, Q&A — product blocks only.
- Inventory mutation on add-to-cart — stock stays read-only demo data.
- Related-products ranking beyond category/species/brand heuristic.

## Capabilities

### New Capabilities
- `product-detail`: the PDP route behavior — rendering, variant selection, price/stock display tied to selected variant, add-to-cart, related products, breadcrumb, metadata, and SSG.

### Modified Capabilities
- None.

## Approach

RSC `page.tsx` awaits `params`, resolves product via `getProductBySlug`, calls `notFound()` if missing. Layout places `<ProductBreadcrumb>` and `<ProductGallery>` (client island) server-side, then the `<ProductPurchasePanel>` (single client orchestrator that owns `selectedVariantId` + `quantity`), followed by `<ProductInfoTabs>` and `<RelatedProducts>`. `<MobileStickyCta>` mounted alongside the panel and subscribes to the same state via props from the panel (same client tree).

Helpers live behind the existing catalog port (`src/lib/catalog.ts`) + a new `src/lib/stock.ts`. Strict TDD order: helpers → pure panel logic (`canAddToCart`, `calculateDiscountPercent`, `findVariantById`) → component behavior via `@testing-library/react` + `userEvent`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/producto/[slug]/page.tsx` | Modified | Stub → RSC PDP with SSG + metadata. |
| `src/app/producto/[slug]/not-found.tsx` | New | 404 fallback. |
| `src/lib/catalog.ts` | Modified | Add 4 helpers. |
| `src/lib/stock.ts` | New | `getProductStockMatrix`. |
| `src/components/product/*` | New | 8 components + tests. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `params` async in Next 16 missed | Med | `await params` in both page and metadata; TS types enforce. |
| `notFound()` called too late | Low | Invoke before any JSX render. |
| Panel state duplication (selected variant in two places) | Low | Single source in `ProductPurchasePanel`; child components receive via props. |
| Hydration mismatch in gallery | Low | Initial index seeded from prop; `priority` only on first image. |

## Rollback Plan

Revert the Slice 3 commit. Stub PDP returns. Home and catalog links keep resolving (they already point to `/producto/[slug]`). No data migration. Cart store is backward compatible (no schema changes).

## Dependencies

None. All primitives (Tabs, ToggleGroup, Breadcrumb, sonner) already in `src/components/ui/`.

## Success Criteria

- [ ] `/producto/royal-canin-medium-adult` renders full PDP server-side with 3 variants.
- [ ] Clicking variant "8 kg" updates price and stock matrix.
- [ ] Quantity 3 + "Agregar" adds `{ productId, variantId, quantity: 3 }` to cart; header badge increments by 3; toast appears.
- [ ] `/producto/bogus-slug` renders the 404 page.
- [ ] Build emits a static route per seed product (44 PDPs prerendered).
- [ ] All gates green: `pnpm lint`, `pnpm typecheck`, `pnpm test` with new tests passing.
