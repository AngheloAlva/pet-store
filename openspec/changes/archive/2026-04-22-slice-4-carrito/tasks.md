# Tasks: slice-4-carrito

**Mode**: Strict TDD — every pair is RED (failing test first) → GREEN (minimal impl). No batching reds across files.

## Phase 1 — Pure helpers (8 tasks)

- [x] 1.1 RED: `src/lib/cart.test.ts` — `clampItemQuantity`: returns 0 when totalStock≤0; clamps to totalStock; clamps to 99; respects requested min.
- [x] 1.2 GREEN: `src/lib/cart.ts` — implement `clampItemQuantity`.
- [x] 1.3 RED: `src/lib/cart.test.ts` — `computeCartTotals`: empty → 0/0/label. Single line / multi-line sums correct. Label is `"Se calcula en el checkout"`. `itemCount` sums quantities.
- [x] 1.4 GREEN: `src/lib/cart.ts` — implement `computeCartTotals`.
- [x] 1.5 RED: `src/lib/stock.test.ts` — `getVariantTotalStock`: all-`in_stock` variant → `4*99=396`; mixed with exceptions sums synthetic units correctly; fully OOS → 0.
- [x] 1.6 GREEN: `src/lib/stock.ts` — add `STATUS_TO_UNITS` and `getVariantTotalStock`.
- [x] 1.7 RED: `src/stores/cart.test.ts` — `isOpen=false` by default; `openCart` sets true; `closeCart` sets false; `setOpen(v)` toggles.
- [x] 1.8 GREEN: `src/stores/cart.ts` — extend state with `isOpen`/`openCart`/`closeCart`/`setOpen`.

## Phase 2 — Store clamp + persist (4 tasks)

- [x] 2.1 RED: `src/stores/cart.test.ts` — `addItem` clamps to totalStock; OOS is no-op; incrementing existing line respects cap.
- [x] 2.2 GREEN: wire `clampItemQuantity` + `getVariantTotalStock` into `addItem`.
- [x] 2.3 RED: `src/stores/cart.test.ts` — `updateQuantity` clamps; qty≤0 removes; `persist.partialize` serializes only `items` (inspect `localStorage["simplepet-cart"]`).
- [x] 2.4 GREEN: add `partialize` to persist config; re-route `updateQuantity` through clamp.

## Phase 3 — Shared components (10 tasks)

- [x] 3.1 RED: `src/components/cart/empty-cart.test.tsx` — renders message + CTA linking to `/catalogo`.
- [x] 3.2 GREEN: `empty-cart.tsx`.
- [x] 3.3 RED: `src/components/cart/cart-summary.test.tsx` — shows subtotal/shipping label/total formatted CLP; checkout button disabled with "Próximamente" helper text.
- [x] 3.4 GREEN: `cart-summary.tsx` (reads store via selectors).
- [x] 3.5 RED: `src/components/cart/cart-line-item.test.tsx` — renders name link, variant, stepper reflects qty, stepper change calls `updateQuantity`, remove button has aria-label `"Quitar {name} del carrito"` and calls `removeItem`, line total = `unitPrice*quantity` formatted CLP.
- [x] 3.6 GREEN: `cart-line-item.tsx`. If needed, extend `QuantityStepper` with optional `max` prop (default 99); update its test.
- [x] 3.7 RED: `src/components/cart/cart-drawer.test.tsx` — closed by default; opens when store `isOpen=true`; renders SheetTitle "Tu carrito"; renders EmptyCart when empty; renders line items when not empty; ESC-driven close calls `setOpen(false)`.
- [x] 3.8 GREEN: `cart-drawer.tsx`.
- [x] 3.9 RED: `src/components/cart/cart-root.test.tsx` — renders `CartDrawer`.
- [x] 3.10 GREEN: `cart-root.tsx`.

## Phase 4 — Wiring (6 tasks)

- [x] 4.1 RED: update `src/components/layout/cart-indicator.test.tsx` (create if absent) — clicking calls `openCart`; no `<a href>` rendered.
- [x] 4.2 GREEN: refactor `cart-indicator.tsx` from `Link` to `onClick={openCart}`.
- [x] 4.3 RED: update `src/components/product/add-to-cart-button.test.tsx` — after click, `openCart` is called; existing `addItem` + toast assertions remain.
- [x] 4.4 GREEN: call `openCart` in `handleClick`; set sonner `duration: 1500`.
- [x] 4.5 Mount `<CartRoot/>` in `src/app/layout.tsx` (no test — structural change; verified via drawer tests).
- [x] 4.6 Confirm no server import of client-only code leaks (quick `pnpm exec tsc --noEmit`).

## Phase 5 — `/carrito` page (4 tasks)

- [x] 5.1 RED: `src/app/carrito/cart-page-client.test.tsx` — pre-hydration renders skeleton; post-hydration with empty cart renders EmptyCart; with items renders line items + summary.
- [x] 5.2 GREEN: `src/app/carrito/cart-page-client.tsx`.
- [x] 5.3 Create `src/app/carrito/page.tsx` (RSC) with metadata and Container shell; no test (static shape).
- [x] 5.4 Manual QA checklist captured in apply-progress: add from PDP opens drawer; reload does not reopen; `/carrito` shows same items; edit qty on page reflects on next drawer open; remove works on both surfaces.

## Gates (hard pass before verify)

- `pnpm test` all green.
- `pnpm lint` 0 warnings.
- `pnpm exec tsc --noEmit` 0 errors.
- No hydration warnings in dev console during manual QA.

## Totals
- 32 discrete tasks across 5 phases.
- ~10 test files touched.
- ~7 new components/helpers, ~5 modified files.
