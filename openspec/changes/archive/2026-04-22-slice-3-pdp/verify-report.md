# Verification Report: slice-3-pdp

**Mode**: Strict TDD

---

## Completeness

| Metric | Value |
|---|---|
| Tasks total | 27 |
| Tasks complete | 27 |
| Tasks incomplete | 0 |

---

## Build & Tests Execution

**Build** (`pnpm build`): ✅ **Passed** — 44 static routes emitted for `/producto/[slug]/*`.

**Tests** (`pnpm test`): ✅ **84/84 passed** across 15 files (62 new in this slice, 22 pre-existing). +4 added during verify-cleanup: 2 synthetic stock-matrix tests (globally-OOS true/false branches), 2 generateMetadata tests.

**Lint** (`pnpm lint`): ✅ **Passed** — 0 errors, 0 warnings. `coverage/**` added to ESLint `globalIgnores`.

**Type check** (`pnpm typecheck`): ✅ **Passed** — 0 errors.

**Coverage** (`pnpm test:coverage`):
- `src/lib/url-params.ts`: 100% lines / 95.55% branches
- `src/lib/pdp.ts`: 100% lines / 91.66% branches
- `src/lib/stock.ts`: 100% lines / 100% branches (synthetic spy tests cover globally-OOS true/false paths)
- `src/lib/catalog.ts`: new helpers 100% covered
- `src/components/product/*`: all tested via `@testing-library/react`

---

## TDD Compliance

| Task | RED (test before impl) | GREEN (impl passes) | Evidence |
|---|---|---|---|
| 1.1+1.2 catalog helpers | ✅ | ✅ | 11 tests failed pre-impl; all green post-impl |
| 1.3+1.4 stock helpers | ✅ | ✅ | Test file created before `stock.ts` module; all green |
| 1.5+1.6 pdp pure | ✅ | ✅ | Test file created before `pdp.ts` module; all green |
| 2.1 breadcrumb | ✅ | ✅ | Tests passed after plain-nav rewrite (Next 16 constraint) |
| 2.2 price | ✅ | ✅ | |
| 2.3 quantity stepper | ✅ | ✅ | Test collision fixed (label deduplication) |
| 2.4 stock list | ✅ | ✅ | |
| 2.5 add-to-cart button | ✅ | ✅ | Cart store state asserted |
| 2.6 mobile sticky CTA | ✅ | ✅ | |
| 2.7 purchase panel | ✅ | ✅ | Test robustness fix (getAllByText for duplicated price) |
| 2.8 gallery | ✅ | ✅ | Alt-text test fix |
| 2.9 info tabs | ✅ | ✅ | Required "use client" (see deviations) |
| 2.10 related | ✅ | ✅ | |

All tasks completed under Strict TDD. RED→GREEN recorded in apply-progress.

---

## Spec Compliance Matrix

Spec domain: `product-detail` (11 requirements, 13 scenarios).

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| REQ-01 Route Resolution & SSG | Valid slug renders SSR | `pnpm build` emits 44 static routes for `/producto/[slug]` | ✅ COMPLIANT |
| REQ-01 Route Resolution & SSG | Unknown slug is 404 | `page.test.ts > generateMetadata returns fallback title for unknown slug` (notFound path structural — build emits 404 route) | ⚠️ PARTIAL — notFound runtime not unit-tested (acceptable; Next API) |
| REQ-02 Dynamic Metadata | Metadata for existing product | `page.test.ts > generateMetadata returns product-derived metadata for a known slug` | ✅ COMPLIANT |
| REQ-03 Breadcrumb | Breadcrumb for a dog food | `product-breadcrumb.test.tsx > renders Inicio, top-level category, and product name` | ✅ COMPLIANT |
| REQ-04 Default Variant Selection | First variant is selected | `product-purchase-panel.test.tsx > selects the first variant by default` | ✅ COMPLIANT |
| REQ-05 Variant Change Updates Price | Switching variant updates price | `product-purchase-panel.test.tsx > updates price display when a different variant is clicked` | ✅ COMPLIANT |
| REQ-05 Variant Change Updates Price | Price + compareAt + discount badge render | `product-price.test.tsx > renders strike-through compareAtPrice and discount badge when on sale` | ✅ COMPLIANT |
| REQ-06 Stock Matrix | Out-of-stock variant in one store | `product-stock-list.test.tsx > labels stock statuses in Spanish` | ✅ COMPLIANT |
| REQ-07 Quantity Stepper | Lower bound (disabled at 1) | `quantity-stepper.test.tsx > disables the minus button at lower bound` | ✅ COMPLIANT |
| REQ-07 Quantity Stepper | Upper bound (disabled at 99) | `quantity-stepper.test.tsx > disables the plus button at upper bound` | ✅ COMPLIANT |
| REQ-08 Add To Cart | Happy path | `add-to-cart-button.test.tsx > adds the product+variant+quantity to the cart on click` + `product-purchase-panel.test.tsx > dispatches add-to-cart with selected variant and quantity` | ✅ COMPLIANT |
| REQ-08 Add To Cart | Globally out-of-stock variant | `add-to-cart-button.test.tsx > is disabled when the variant is globally out of stock` | ✅ COMPLIANT |
| REQ-09 Related Products | 4 related rendered | `related-products.test.tsx > renders at most 4 related products` + `excludes current` | ✅ COMPLIANT |
| REQ-10 Info Tabs | Nutrition hidden when empty | `product-info-tabs.test.tsx > hides the Nutrición tab when nutritionalAnalysis is absent` | ✅ COMPLIANT |
| REQ-11 Mobile Sticky CTA | Dispatches add | `mobile-sticky-cta.test.tsx > dispatches the same cart payload as the desktop button on click` | ✅ COMPLIANT |

**Compliance summary**: 14/15 scenarios COMPLIANT, 1 PARTIAL (notFound runtime — acceptable; API is Next-provided).

---

## Correctness (Static — Structural Evidence)

| Requirement | Status | Notes |
|---|---|---|
| REQ-01 Route Resolution & SSG | ✅ Implemented | `generateStaticParams` returns all 44 slugs; `notFound()` on miss; build verifies prerender. |
| REQ-02 Dynamic Metadata | ✅ Implemented | `generateMetadata` awaits params, returns title/description/openGraph. |
| REQ-03 Breadcrumb | ✅ Implemented | Plain nav+Link with aria-current on product (rewrite — see Coherence). |
| REQ-04 Default Variant | ✅ Implemented | `useState(product.variants[0].id)` in `ProductPurchasePanel`. |
| REQ-05 Variant Change | ✅ Implemented | Panel propagates `selectedVariantId` to `ProductPrice` + `ProductStockList`. |
| REQ-06 Stock Matrix | ✅ Implemented | `getProductStockMatrix(variantId)` + per-store rendering. |
| REQ-07 Quantity Stepper | ✅ Implemented | `clampQuantity` applied; buttons disabled at bounds. |
| REQ-08 Add To Cart | ✅ Implemented | Cart payload matches spec; disabled when globally OOS. |
| REQ-09 Related Products | ✅ Implemented | Scoring: category(3) > species(2) > brand(1); limit 4; excludes self. |
| REQ-10 Info Tabs | ✅ Implemented | Tabs conditionally rendered based on data presence. |
| REQ-11 Mobile Sticky CTA | ✅ Implemented | `md:hidden` + same addItem dispatch as desktop. |

---

## Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| Single client orchestrator `ProductPurchasePanel` | ✅ Yes | Owns `selectedVariantId` + `quantity`; children receive via props. |
| Plain Button list for variants (not ToggleGroup) | ✅ Yes | Avoided array-valued API. |
| `getProductStockMatrix` port | ✅ Yes | New `src/lib/stock.ts`. |
| Globally-OOS logic in stock helper | ✅ Yes | `isVariantGloballyOutOfStock` used by `canAddToCart`. |
| Related heuristic (3/2/1) | ✅ Yes | Tested. |
| Mobile sticky CTA inside panel tree | ✅ Yes | Same state, same handler. |
| TDD order: helpers → pure → components | ✅ Yes | Evidenced in apply-progress. |
| Breadcrumb uses shadcn primitives | ⚠️ Deviated | Rewritten as plain nav+Link due to Next 16 Turbopack `createContext` failure when shadcn Breadcrumb (uses `useRender` from base-ui) is imported into an RSC during collect-page-data. Spec behavior preserved. |
| `ProductInfoTabs` as RSC wrapper of Tabs | ⚠️ Deviated | Marked `"use client"`. Same Turbopack constraint — wrapping Tabs in RSC fails at build. |
| `sonner` imported top-level in client component | ⚠️ Deviated | Changed to `const { toast } = await import("sonner")` inside handlers. Static import broke build via same createContext chain. |

All 3 deviations are **acceptable workarounds** for a Next 16 + Turbopack constraint, documented in apply-progress with reproduction details. Spec behavior preserved in all cases.

---

## Issues Found

### CRITICAL

None.

### WARNING

None (all 3 warnings from the initial verify pass were resolved in-flight).

### SUGGESTION

1. Future Next 16 / Turbopack gotcha — when touching any shadcn primitive that imports from `@base-ui/react/use-render`, `@base-ui/react/merge-props`, or similar base-ui hooks, verify RSC-friendliness with an early `pnpm build` during slice scaffolding to catch the `createContext` issue before Phase 4.
2. Consider end-to-end coverage for `notFound()` once Playwright lands — the only remaining non-runtime-verified behavior.

---

## Verdict

✅ **PASS**

All 27 tasks complete, Strict TDD evidence intact, 84/84 tests pass, lint/typecheck clean, build emits the required 44 static PDP routes. 3 deviations are justified Next 16 / Turbopack workarounds preserving spec behavior. 14/15 scenarios runtime-compliant; the remaining PARTIAL (`notFound()` runtime behavior) relies on build-time verification. No CRITICAL, no WARNING. Ready for archive.
