# Design: Slice 3 — Product Detail Page

## Technical Approach

RSC page at `src/app/producto/[slug]/page.tsx` awaits `params`, resolves the product via a new `getProductBySlug` helper, calls `notFound()` if missing, and composes the PDP from a mix of Server Components (breadcrumb, info tabs, related) and a single client orchestrator (`ProductPurchasePanel`) that owns all interactive state. Gallery is its own small client island because thumbnails need click handlers. Build-time `generateStaticParams` emits 44 static routes; `generateMetadata` resolves title + description + OG image per product. Strict TDD drives the order: helpers → pure panel logic → components (behavior tests, not snapshots).

## Architecture Decisions

### Decision: Single client orchestrator vs Context-based composition

| Option | Tradeoff | Decision |
|---|---|---|
| Single `<ProductPurchasePanel />` owns `selectedVariantId` + `quantity`; variants/price/stock/add-to-cart are children receiving props | Zero prop drilling inside the panel; state colocated; no Context boilerplate; mount-once in tests | ✅ Chosen |
| Context provider at PDP root; stock/price/CTA subscribe | Allows RSC siblings outside the panel to react to selected variant | Rejected — no current sibling actually needs to react; Context would be dead weight |
| Per-PDP Zustand store | Overkill for one page's ephemeral state | Rejected |

### Decision: Variant selector UI

| Option | Tradeoff | Decision |
|---|---|---|
| Plain `<Button>` list with `onClick` toggling state | Base UI `ToggleGroup` forces array-valued API even in single-select; buttons are one component with clean behavior | ✅ Chosen |
| Base UI `ToggleGroup` (`value: string[]`, `onValueChange: (vals) => void`) | Correct semantic for toggle, but awkward for single-select (unwrap `vals[0]`); no accessibility gain here | Rejected |
| `Select` dropdown | Hides variant prices until opened; worse for scanning | Rejected |

### Decision: Stock matrix per variant lives in `src/lib/stock.ts`

Single helper `getProductStockMatrix(variantId)` returns `{ store, status }[]`. UI never touches `getStockLevel` or raw exceptions. Keeps stock logic testable in isolation and gives Fase 3 a single seam to swap for a real inventory backend.

### Decision: "Globally out of stock" logic

A variant is considered globally out-of-stock when `getProductStockMatrix(variantId).every(r => r.status === "out_of_stock")`. Helper function in stock.ts: `isVariantGloballyOutOfStock(variantId)`. Add-to-cart button reads this to decide `disabled` state.

### Decision: Related products heuristic

`getRelatedProducts(product, limit = 4)` scores candidates: +3 for shared top-level category, +2 for shared species, +1 for shared brand; excludes self; sorts descending; takes top N. Deterministic and testable.

### Decision: Mobile sticky CTA inside the panel tree

`<MobileStickyCta>` is a child of `<ProductPurchasePanel>`, positioned `fixed bottom-0 inset-x-0 md:hidden` with backdrop-blur. Hosting it inside the panel means no Context or portal is needed — it reads the same `selectedVariantId` + `quantity` the desktop button uses, and dispatches the same handler.

## Data Flow

```
URL /producto/[slug]
  │
  ▼
page.tsx (RSC) ── await params ─┐
  ├─→ getProductBySlug ─────────┤
  │      (notFound() on miss)   │
  ▼                             │
┌─── Breadcrumb (RSC) ───────┐  │
├─── ProductGallery (client) ┤  │
├─── ProductPurchasePanel (client orchestrator)
│     ├─ useState selectedVariantId
│     ├─ useState quantity
│     ├─ VariantPills (buttons)
│     ├─ ProductPrice (selected variant)
│     ├─ ProductStockList (getProductStockMatrix)
│     ├─ QuantityStepper
│     ├─ AddToCartButton → useCartStore.addItem + toast
│     └─ MobileStickyCta (same state, same handler)
├─── ProductInfoTabs (RSC)
└─── RelatedProducts (RSC) → ProductCard[]
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/app/producto/[slug]/page.tsx` | Modify | Stub → RSC PDP with `generateStaticParams` + `generateMetadata`. |
| `src/app/producto/[slug]/not-found.tsx` | Create | 404 page. |
| `src/lib/catalog.ts` | Modify | Add `getProductBySlug`, `getRelatedProducts`, `getCategoryById`, `getCategoryBreadcrumb`. |
| `src/lib/stock.ts` | Create | `getProductStockMatrix`, `isVariantGloballyOutOfStock`. |
| `src/lib/pdp.ts` | Create | Pure logic: `calculateDiscountPercent`, `findVariantById`, `canAddToCart`, `clampQuantity`. |
| `src/components/product/product-breadcrumb.tsx` | Create | RSC. |
| `src/components/product/product-gallery.tsx` | Create | Client, hero + thumbnails. |
| `src/components/product/product-purchase-panel.tsx` | Create | Client orchestrator. |
| `src/components/product/product-price.tsx` | Create | Pure RSC-compatible (no state). |
| `src/components/product/product-stock-list.tsx` | Create | Client (inside panel). |
| `src/components/product/quantity-stepper.tsx` | Create | Client. |
| `src/components/product/add-to-cart-button.tsx` | Create | Client. |
| `src/components/product/mobile-sticky-cta.tsx` | Create | Client. |
| `src/components/product/product-info-tabs.tsx` | Create | RSC, shadcn Tabs wrapper. |
| `src/components/product/related-products.tsx` | Create | RSC. |
| `src/components/product/*.test.tsx` | Create | Vitest + testing-library. |

## Interfaces / Contracts

```ts
// src/lib/catalog.ts additions
export function getProductBySlug(slug: string): Product | undefined;
export function getRelatedProducts(product: Product, limit?: number): Product[];
export function getCategoryById(id: string): Category | undefined;
export function getCategoryBreadcrumb(categoryId: string): Category[];  // root → leaf

// src/lib/stock.ts
export type StockRow = { store: Store; status: StockStatus };
export function getProductStockMatrix(variantId: string): StockRow[];
export function isVariantGloballyOutOfStock(variantId: string): boolean;

// src/lib/pdp.ts
export function findVariantById(product: Product, variantId: string): ProductVariant;
export function calculateDiscountPercent(variant: ProductVariant): number | null;
export function clampQuantity(n: number): number;  // [1, 99]
export function canAddToCart(variantId: string): boolean;  // delegates to stock
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `getProductBySlug`, `getRelatedProducts` (category > species > brand ordering, self exclusion), `getCategoryBreadcrumb`, `getProductStockMatrix`, `isVariantGloballyOutOfStock`, `calculateDiscountPercent`, `clampQuantity` | Vitest, real seed data |
| Component | Panel: default variant active, click variant → price updates, clamp stepper, add-to-cart dispatches correct payload, disabled when globally OOS; Gallery: click thumbnail swaps hero; Info tabs: nutrition tab hidden when empty; Related: excludes self + limit 4 | `@testing-library/react` + `userEvent`; mock `useCartStore` via real store + reset in `beforeEach` |
| E2E | Full flow (add to cart → badge increments) | Deferred — no Playwright |

## Migration / Rollout

None. Additive. Atomic replace of PDP stub.

## Open Questions

None blocking.
