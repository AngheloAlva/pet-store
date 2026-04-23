# Tasks: Slice 3 — Product Detail Page

Strict TDD: each pair = RED (failing test) → GREEN (minimal impl). REFACTOR only if warranted.

## Phase 1: Pure Helpers

- [x] 1.1 RED: `src/lib/catalog.test.ts` — extend with tests for `getProductBySlug`, `getCategoryById`, `getCategoryBreadcrumb` (root → leaf), `getRelatedProducts` (+3 shared category / +2 species / +1 brand, excludes self, limit 4).
- [x] 1.2 GREEN: implement the 4 helpers in `src/lib/catalog.ts`.
- [x] 1.3 RED: `src/lib/stock.test.ts` — tests for `getProductStockMatrix(variantId)` (returns row per store with merged status) and `isVariantGloballyOutOfStock` (true iff every row is out_of_stock).
- [x] 1.4 GREEN: create `src/lib/stock.ts` with both helpers (reads `stores`, `getStockLevel`).
- [x] 1.5 RED: `src/lib/pdp.test.ts` — tests for `findVariantById` (throws on miss), `calculateDiscountPercent` (null when no compareAt, rounded % otherwise), `clampQuantity` (1..99, floor, min, max), `canAddToCart(variantId)` (delegates to stock).
- [x] 1.6 GREEN: create `src/lib/pdp.ts` with the 4 pure functions.

## Phase 2: Components (RED → GREEN per component)

- [x] 2.1 Breadcrumb: test renders `Inicio / Categoría / Producto`; last crumb has `aria-current="page"`. Implement `src/components/product/product-breadcrumb.tsx` (RSC) using shadcn Breadcrumb primitives.
- [x] 2.2 Price: test renders CLP price, strike for `compareAtPrice`, discount badge with correct `-N%`. Implement `src/components/product/product-price.tsx`.
- [x] 2.3 Quantity stepper: test clamp at 1 (minus disabled) and 99 (plus disabled); onChange emits new value. Implement `src/components/product/quantity-stepper.tsx`.
- [x] 2.4 Stock list: test renders 4 rows (stores), label matches status per selected variant. Implement `src/components/product/product-stock-list.tsx`.
- [x] 2.5 Add-to-cart button: test calls `useCartStore.addItem` with full payload; toast appears; disabled when `isVariantGloballyOutOfStock`. Implement `src/components/product/add-to-cart-button.tsx`.
- [x] 2.6 Mobile sticky CTA: test renders fixed bar below md with price + Agregar; Agregar dispatches same payload. Implement `src/components/product/mobile-sticky-cta.tsx`.
- [x] 2.7 Purchase panel orchestrator: test default variant active, click variant updates price + stock rows, stepper + add-to-cart integrated. Implement `src/components/product/product-purchase-panel.tsx` composing 2.2–2.6.
- [x] 2.8 Gallery: test hero renders first image, click thumbnail swaps hero, single image hides strip. Implement `src/components/product/product-gallery.tsx`.
- [x] 2.9 Info tabs: test hides nutrition tab when `nutritionalAnalysis` absent. Implement `src/components/product/product-info-tabs.tsx` (RSC).
- [x] 2.10 Related products: test renders up to 4 `ProductCard`, excludes current product. Implement `src/components/product/related-products.tsx` (RSC).

## Phase 3: Page Wiring

- [x] 3.1 Rewrite `src/app/producto/[slug]/page.tsx` — RSC; await `params`; `getProductBySlug` → `notFound()` if undefined; render `<ProductBreadcrumb>`, `<ProductGallery>`, `<ProductPurchasePanel>`, `<ProductInfoTabs>`, `<RelatedProducts>` inside `<Container>` with 2-col grid (gallery left, panel right on md+).
- [x] 3.2 Add `generateStaticParams()` returning `products.map(p => ({ slug: p.slug }))`.
- [x] 3.3 Add `generateMetadata({ params })` — dynamic title/description/openGraph from product; fallback when missing.
- [x] 3.4 Create `src/app/producto/[slug]/not-found.tsx` — friendly 404 with link to catalog.

## Phase 4: Polish

- [x] 4.1 A11y audit — gallery thumbs have `aria-label`, stepper buttons have `aria-label`, variant buttons have `aria-pressed`, sticky CTA has `aria-label`.
- [x] 4.2 No `asChild`; all Button-as-Link uses `render={<Link />}`.
- [x] 4.3 Mobile padding — body `pb-24 md:pb-0` so sticky CTA doesn't cover last content.

## Phase 5: Verification

- [x] 5.1 `pnpm test` — all new + existing tests green.
- [x] 5.2 `pnpm lint` + `pnpm typecheck` — clean.
- [x] 5.3 `pnpm test:coverage` — helpers 100%, components ≥ 80% line coverage.
- [x] 5.4 `pnpm build` — verify 44 static routes emitted under `/producto/[slug]`.
