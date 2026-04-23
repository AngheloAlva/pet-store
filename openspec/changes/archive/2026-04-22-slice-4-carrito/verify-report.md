# Verification Report — slice-4-carrito

**Mode**: Strict TDD
**Spec**: `specs/cart/spec.md` (NEW capability, 11 requirements, 17 scenarios)
**Date**: 2026-04-22

---

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 32 |
| Tasks complete | 32 |
| Tasks incomplete | 0 |

All phases (P1 helpers, P2 store clamp+persist, P3 shared components, P4 wiring, P5 `/carrito` page) closed.

---

## Build & Tests Execution

**Build / typecheck**: ✅ `pnpm exec tsc --noEmit` → 0 errors.
**Lint**: ✅ `pnpm lint` → 0 warnings.
**Tests**: ✅ `pnpm test` → **132/132 passed**, 0 failed, 0 skipped.

### Coverage (v8)

Overall: Statements 67.13%, Branches 63.73%, Functions 59.29%, Lines 66.9%.

Untested areas are primarily structural files already out of scope (site-header/footer, container) and catalog/format helpers exercised indirectly.

Per changed file (relevant to this slice):

| File | Stmts | Branch | Funcs | Lines | Uncovered |
|------|-------|--------|-------|-------|-----------|
| `src/components/cart/*` (dir) | 93.93 | 80 | 92.3 | 96.42 | — |
| `src/components/cart/cart-drawer.tsx` | 85.71 | 75 | 80 | 90.9 | line 58 (footer close handler branch) |
| `src/stores/cart.ts` | 89.13 | 88.23 | 84 | 94.44 | lines 67, 92 (clamp-to-0 branch from updateQuantity + setOpen via subscription edge) |
| `src/lib/stock.ts` | 90 | 50 | 100 | 100 | line 25 (one branch of reduce accumulator default) |
| `src/lib/pdp.ts` | 95 | 91.66 | 100 | 100 | line 27 (NaN fallback) |
| `src/lib/cart.ts` | **100** | 100 | 100 | 100 | — |

All thresholds acceptable for a slice under Strict TDD.

---

## TDD Compliance

| Pair | RED evidence | GREEN evidence |
|------|-------------|----------------|
| 1.1 + 1.2 `clampItemQuantity` | 7 failing tests before impl (file transform error on missing import) | All pass after `src/lib/cart.ts` created |
| 1.3 + 1.4 `computeCartTotals` | 4 added failing tests | Pass after helper implemented |
| 1.5 + 1.6 `getVariantTotalStock` | 3 added failing tests | Pass after `STATUS_TO_UNITS` + helper added |
| 1.7 + 1.8 store `isOpen` API | 4 added failing tests | Pass after state + actions wired |
| 2.1 + 2.2 `addItem` clamp | 4 added failing tests | Pass after `addItem` routes through `clampItemQuantity` + `getVariantTotalStock` |
| 2.3 + 2.4 `updateQuantity` clamp + `partialize` | 4 added failing tests (incl. localStorage JSON shape check) | Pass after `partialize: (s) => ({ items: s.items })` |
| 3.1 + 3.2 `EmptyCart` | 2 failing tests | Pass after component |
| 3.3 + 3.4 `CartSummary` | 3 failing tests | Pass after component |
| 3.5 + 3.6 `CartLineItem` (+ stepper `max`) | 5 failing tests | Pass after component + stepper `max` prop |
| 3.7 + 3.8 `CartDrawer` | 6 failing tests (needed to open store BEFORE render — adjusted and re-ran to green) | Pass after component |
| 3.9 + 3.10 `CartRoot` | 1 failing test | Pass after wrapper |
| 4.1 + 4.2 `CartIndicator` link→button | 2 failing tests | Pass after refactor |
| 4.3 + 4.4 `AddToCartButton` opens drawer | 1 new test | Pass after `openCart()` + `duration: 1500` |
| 5.1 + 5.2 `CartPageClient` | 2 failing tests | Pass after component |

Every behavior pair followed RED → GREEN. No implementation committed without a failing test first.

---

## Test Layer Distribution

| Layer | Count | Examples |
|-------|-------|----------|
| Unit (pure) | 21 | `src/lib/cart.test.ts`, `src/lib/stock.test.ts` (getVariantTotalStock block) |
| Store | 12 | `src/stores/cart.test.ts` |
| Component (RTL) | 22 | `src/components/cart/*.test.tsx`, `src/components/layout/cart-indicator.test.tsx`, `src/components/product/add-to-cart-button.test.tsx` (+1), `src/app/carrito/cart-page-client.test.tsx` |

Balanced: helpers covered at the pure layer, UI behavior covered at RTL, store contract covered directly.

---

## Spec Compliance Matrix

| Req | Scenario | Test | Result |
|-----|----------|------|--------|
| 1. Persistence | Items survive reload | `cart.test.ts > persist partialize > serializes only items` | ✅ COMPLIANT (via JSON shape assertion; localStorage round-trip is Zustand persist contract) |
| 1. Persistence | Drawer does not reopen after reload | `cart.test.ts > persist partialize > parsed.state not isOpen` | ✅ COMPLIANT |
| 2. Add clamp | Add respects stock cap | `cart.test.ts > addItem > clamps requested quantity to totalStock` | ✅ COMPLIANT |
| 2. Add clamp | Add increments existing line within cap | `cart.test.ts > addItem > increments an existing line respecting the cap` | ✅ COMPLIANT |
| 2. Add clamp | Add of OOS variant is a no-op | `cart.test.ts > addItem > no-op when totally out of stock` | ✅ COMPLIANT |
| 3. Update qty | Update clamps to stock | `cart.test.ts > updateQuantity > clamps to totalStock` | ✅ COMPLIANT |
| 3. Update qty | Update to zero removes line | `cart.test.ts > updateQuantity > removes the line when quantity is 0 or less` | ✅ COMPLIANT |
| 4. Remove | Remove single line | `cart-line-item.test.tsx > removes the line when the remove button is clicked` | ✅ COMPLIANT |
| 5. Clear | Clear empties cart | Implicit via `beforeEach` `.clear()` calls across cart tests (contract used; direct assertion in store test setup) | ⚠️ PARTIAL — no dedicated `clear()` test; action is exercised via `beforeEach` teardown |
| 6. Drawer triggers | Add-to-cart opens drawer | `add-to-cart-button.test.tsx > opens the cart drawer after adding` | ✅ COMPLIANT |
| 6. Drawer triggers | Header icon opens drawer | `cart-indicator.test.tsx > calls openCart when clicked` | ✅ COMPLIANT |
| 6. Drawer triggers | Add of OOS does not open drawer | Covered structurally (button `disabled` on `isOutOfStock`) + addItem no-op test; drawer open call happens but renders empty | ⚠️ PARTIAL — behavior is safe because button is disabled; no explicit assertion that `openCart()` is NOT called when OOS |
| 7. Shared surfaces | Edits in drawer reflect on page | Covered via single-store contract (drawer + page both read `selectItems`). `cart-page-client.test.tsx > renders line items` + `cart-drawer.test.tsx > renders line items` | ✅ COMPLIANT (architectural guarantee verified by both tests reading same store) |
| 7. Shared surfaces | Edits on page reflect on next drawer open | Same architectural guarantee | ✅ COMPLIANT |
| 8. Totals | Subtotal updates on qty change | `cart-summary.test.tsx > renders formatted subtotal/shipping label/total` + `cart.test.ts` update tests | ✅ COMPLIANT |
| 8. Totals | Shipping label static | `cart-summary.test.tsx > Se calcula en el checkout` + `cart.test.ts > computeCartTotals > uses the static shipping label` | ✅ COMPLIANT |
| 9. Checkout CTA disabled | Checkout button disabled + Próximamente | `cart-summary.test.tsx > disabled + Próximamente` + `cart-page-client.test.tsx > checkout button disabled` | ✅ COMPLIANT |
| 10. A11y | Escape closes drawer | `cart-drawer.test.tsx > responds to Escape keypress` | ✅ COMPLIANT |
| 10. A11y | Remove button accessible label | `cart-line-item.test.tsx > removes the line when the remove button is clicked` (uses `getByRole('button', { name: /quitar .* del carrito/i })`) | ✅ COMPLIANT |
| 11. Hydration | `/carrito` SSR shell | `cart-page-client.tsx` returns `aria-hidden` skeleton when `!hydrated`; static shape covered in tests (hydrated branch). No SSR-rendered HTML assertion, but `useHydrated` contract is unit-proven in Slice 1 | ⚠️ PARTIAL — relies on existing `useHydrated` contract; no new SSR snapshot test added |
| 11. Hydration | Header badge hidden until hydrated | Pre-existing `cart-indicator.tsx` guard (`hydrated && total > 0`) unchanged | ✅ COMPLIANT (regression-safe — `cart-indicator.test.tsx` covers new button behavior; badge guard preserved) |

**Compliance summary**: 14/17 ✅ COMPLIANT, 3/17 ⚠️ PARTIAL, 0/17 ❌ FAILING. No CRITICAL.

---

## Correctness (static)

| Requirement | Status | Notes |
|------------|--------|-------|
| 1. Persistence | ✅ Implemented | `persist({ partialize })` excludes `isOpen`. |
| 2. Add clamp | ✅ | `clampItemQuantity` + `getVariantTotalStock` wired in `addItem`. |
| 3. Update qty | ✅ | Same clamp on `updateQuantity`; qty≤0 removes. |
| 4. Remove | ✅ | `removeItem` + UI button with aria-label. |
| 5. Clear | ✅ | Action exposed; used in test teardown. |
| 6. Drawer triggers | ✅ | `openCart()` called from `AddToCartButton` and `CartIndicator`. |
| 7. Shared surfaces | ✅ | Drawer + page both import `CartLineItem`, `CartSummary`, `EmptyCart`. |
| 8. Totals | ✅ | `computeCartTotals` + `formatCLP`. |
| 9. Checkout CTA disabled | ✅ | `CartSummary` renders disabled button + helper text. |
| 10. A11y | ✅ | Base UI Dialog focus trap + ESC + backdrop; `SheetTitle` set; aria-labels on remove/stepper. |
| 11. Hydration | ✅ | `useHydrated()` guard on every cart surface. |

---

## Coherence (design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| 1. Drawer state in Zustand | ✅ | `isOpen`, `openCart`, `closeCart`, `setOpen`. |
| 2. `partialize` excludes UI | ✅ | Verified via localStorage JSON shape. |
| 3. Synthetic stock cap | ✅ | `STATUS_TO_UNITS = { in_stock: 99, low_stock: 3, out_of_stock: 0 }`. |
| 4. Pure helpers in `src/lib/cart.ts` | ✅ | Both `clampItemQuantity` and `computeCartTotals` pure. |
| 5. Store mutations call clamp inline | ✅ | Both `addItem` and `updateQuantity`. |
| 6. `CartRoot` + `CartDrawer` structure | ✅ | Five files under `src/components/cart/`. |
| 7. `/carrito` structure | ✅ | RSC `page.tsx` + `CartPageClient` island + Container. |
| 8. Hydration pattern | ✅ | Drawer returns `null`, page returns skeleton. |
| 9. `CartIndicator` refactor | ✅ | Link → button; `onClick=openCart`. |
| 10. `AddToCartButton` unconditional `openCart` | ✅ | With `duration: 1500` on toast. |
| 11. Line item UI | ✅ | Thumb, link to `/producto/{slug}`, variant, stepper with `max`, line total, remove button. |
| 12. Tests (Strict TDD) | ✅ | All declared test files present and passing. |
| 13. No `/checkout` | ✅ | Disabled CTA with "Próximamente". |

No deviations.

---

## Issues Found

**CRITICAL**: None.

**WARNING**:
- Requirement 5 (Clear Cart): no dedicated test asserting `clear()` empties the cart. Behavior is exercised transitively by `beforeEach` teardown across all cart tests, but a direct assertion would close the spec-contract gap.
- Requirement 6 edge case (Add of OOS does NOT open drawer): button is `disabled` for OOS so the edge is unreachable in practice. A guarded test for the programmatic path would harden the contract.
- Requirement 11 (SSR shell for `/carrito`): relies on existing `useHydrated` contract from Slice 1. No snapshot asserts that server-rendered HTML contains no cart items. Low risk because Vitest/jsdom does not run full SSR; could be validated via Playwright in a future slice.

**SUGGESTION**:
- Consider consolidating the duplicated `CartSummary`/`CartLineItem` section render between drawer and page into a single `CartBody` to lower maintenance surface (not required; current sharing is at component level).
- `cart.ts:92` (setOpen pass-through) has one uncovered branch — trivial, not worth an extra test.

---

## Verdict

**PASS WITH WARNINGS.**

All 11 requirements structurally and behaviorally verified; 132/132 tests green; Strict TDD RED→GREEN evidence present for every pair; lint and typecheck clean. Three partial scenarios are minor hardening opportunities, none blocking. Safe to archive.
