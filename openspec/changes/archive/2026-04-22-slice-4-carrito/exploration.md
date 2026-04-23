## Exploration: slice-4-carrito

### Current State

Cart plumbing is partially wired from Slice 0 + Slice 3:

- **`src/stores/cart.ts`** — Zustand 5 store with `persist({ name: "simplepet-cart", version: 1 })`. Shape: `CartItem[]` keyed by `(productId, variantId)`. Actions: `addItem(item, qty?)`, `removeItem(key)`, `updateQuantity(key, qty)` (removes when `qty <= 0`), `clear()`. Selectors: `selectTotalItems`, `selectSubtotal`. **No UI-state flags, no stock clamp.**
- **`src/components/layout/cart-indicator.tsx`** — header badge; renders as `<Button render={<Link href="/carrito" />}>`. Shows total count once `useHydrated()` returns true. **Today, clicking it 404s — `/carrito` does not exist.**
- **`src/components/product/add-to-cart-button.tsx`** — PDP CTA. Calls `addItem()` then shows a `sonner` toast. No drawer trigger.
- **`src/components/ui/sheet.tsx`** — Base UI `Dialog`-backed Sheet. Supports `side`, auto focus trap + ESC, close button uses `render={<Button .../>}` pattern (canonical).
- **`src/lib/use-hydrated.ts`** — `useSyncExternalStore` guard. Already used by `CartIndicator`.
- **`src/lib/pdp.ts`** → `clampQuantity` (1..99). `QuantityStepper` consumes it.
- **`src/lib/stock.ts`** — `getProductStockMatrix(variantId)` returns per-store status (`in_stock` | `low_stock` | `out_of_stock`). `isVariantGloballyOutOfStock(variantId)` is the only aggregate. **No numeric cap per variant across stores.**
- **`src/app/layout.tsx`** — `<body>` mounts `SiteHeader`, `<main>`, `SiteFooter`, `<Toaster/>`. No drawer/portal root needed; Base UI `Dialog.Portal` handles that.

### Affected Areas

- `src/stores/cart.ts` — ADD `isOpen`, `openCart`, `closeCart`, `setOpen`; exclude UI flag from persist via `partialize`. Optionally add `lastAddedKey` for drawer highlight (stretch).
- `src/lib/stock.ts` — ADD `getVariantTotalStock(variantId): number` (sum numeric stock across stores) to enable clamp.
- `src/data/stock.ts` — verify it exposes numeric stock (currently exposes `status`); may need a helper that returns quantity, not just the bucket.
- `src/components/layout/cart-indicator.tsx` — swap `Link` for a button that calls `openCart()`. Keep `aria-label="Carrito"`, keep badge.
- `src/components/product/add-to-cart-button.tsx` — after `addItem`, call `openCart()`. Keep sonner toast (redundant but useful if drawer is dismissed fast).
- `src/components/cart/` (NEW) — `cart-drawer.tsx` (client), `cart-line-item.tsx` (client), `cart-summary.tsx` (client), `empty-cart.tsx` (shared), `cart-root.tsx` (mounts drawer, used in root layout).
- `src/app/carrito/page.tsx` (NEW) — RSC shell with `<CartPageClient />` island.
- `src/app/carrito/cart-page-client.tsx` (NEW) — client orchestrator reading Zustand.
- `src/app/layout.tsx` — mount `<CartRoot />` once so the drawer is available globally.
- `src/lib/cart.ts` (NEW, pure) — `clampItemQuantity(requested, max)`, `computeCartTotals(items)` returning `{ subtotal, shippingLabel, total, itemCount }`.

### Approaches

1. **Drawer only, no `/carrito` page** — CartIndicator and add-to-cart open drawer; page removed.
   - Pros: less surface; less code; still covers the full flow for a demo.
   - Cons: CartIndicator's current href `/carrito` breaks direct-link / bookmark / share. Tight on mobile (drawer on narrow viewports is cramped). No URL for a "full cart" view.
   - Effort: Low.

2. **Page only, no drawer** — `/carrito` is the only cart UI; add-to-cart flashes a toast and links there.
   - Pros: simple; great on mobile; URL-addressable.
   - Cons: interrupts browsing (nav away from PDP/catalog); no "quick peek" affordance; feels dated for e-commerce demo.
   - Effort: Low.

3. **Drawer + `/carrito` page (both)** — drawer is the default quick-review surface; page is a canonical fallback + richer edit view.
   - Pros: covers every entry point (add-to-cart, header icon, deep link, mobile). Page works even with JS disabled on RSC render. Drawer accelerates browse → add loop.
   - Cons: two surfaces to keep in sync. More tests. Slight duplication of line-item + summary.
   - Effort: Medium.

### Recommendation

**Approach 3 — Drawer + `/carrito` page with shared components.** Extract `CartLineItem`, `CartSummary`, and `EmptyCart` so both surfaces share the same building blocks. Drawer is the default open on `addItem` via a Zustand `isOpen` flag; `/carrito` page reads the same store. This matches Chilean e-commerce norms (PedidosYa, Falabella, PetMarket) and lets you demo shareable cart URLs.

Specific decisions:

- **Open/close state**: Zustand `isOpen` + `openCart()` / `closeCart()` / `setOpen(v)`. **Exclude from persist** via `partialize: (s) => ({ items: s.items })`. Rationale: a local Sheet state in the header can't be triggered from `AddToCartButton` which lives under the PDP tree — they share no React tree boundary.

- **Drawer trigger pattern**: mount a single `<CartDrawer />` inside `<CartRoot />` in `app/layout.tsx`. `CartRoot` is a client component; `CartDrawer` reads `isOpen` from Zustand and binds to Base UI `Dialog.Root` controlled mode via `open` + `onOpenChange` (mapped to `setOpen`).

- **CartIndicator**: change from `<Button render={<Link/>}>` to `<Button onClick={openCart}>`. Keep the `<Link href="/carrito">` as a secondary "Ver carrito completo" in the drawer footer for the page route.

- **Stock clamp**:
  - Add `getVariantTotalStock(variantId: string): number` in `src/lib/stock.ts` (sums per-store quantity; needs a numeric accessor from `src/data/stock.ts`).
  - Clamp on `addItem` and `updateQuantity`: `Math.min(requested, totalStock)`. Expose `maxForLine(item)` from the store or derive in components.
  - Keep `clampQuantity(1..99)` but chain with stock cap.

- **Hydration**: every client surface reading persisted state guards with `useHydrated()` (already the pattern in `CartIndicator`). Drawer renders null on SSR; page renders an empty-state placeholder until hydrated.

- **Empty state**: shared `EmptyCart` — centered `ShoppingCartSimple`, "Tu carrito está vacío", CTA `<Button render={<Link href="/catalogo" />}>Ver catálogo</Button>`. Same component in drawer and page.

- **Totals**: subtotal via `selectSubtotal`; shipping shown as label-only ("Se calcula en el checkout"); total = subtotal. All formatted via `formatCLP`.

- **Checkout CTA**: `<Button>` labeled "Ir al checkout" that links to `/checkout`. For this slice, `/checkout` is NOT created — the button is disabled with a small helper text "Próximamente" when out-of-scope. Alternative: link to `mailto:` WIP. **Recommend disabled + helper text** to keep the slice tight.

- **Line item UI**: thumb (64px), product name as `Link` → `/producto/{slug}`, variantName below, `QuantityStepper` bound to `updateQuantity` with `max={totalStock}`, line total on the right, small X remove button. aria-label on remove: `Quitar {name} del carrito`.

- **A11y**: `SheetTitle` text "Tu carrito" (required for Base UI Dialog screen-reader contract). `SheetDescription` with item count. Focus trap + ESC + backdrop click → all handled by Base UI out of the box. Ensure remove buttons are keyboard reachable; steppers already are.

- **Mobile**: Sheet `side="right"` full-height on mobile (default `w-3/4` up to `sm:max-w-sm`). Consider `side="bottom"` on `< sm` for ergonomics — stretch goal, not required.

### Risks

- **Persist + `isOpen` reappear after reload**: MUST `partialize` to exclude UI flag. Without this, the drawer opens on every page load. Write a test.
- **`/carrito` page is client-heavy**: dynamic cart can't SSR meaningfully, but the page must still render a valid empty shell on server to avoid hydration mismatch. Use `useHydrated()` and render a neutral skeleton.
- **Stock cap needs numeric source**: `src/data/stock.ts` currently returns `{ status: StockStatus }`. Verify there's a numeric quantity or derive a synthetic cap (e.g., `in_stock → 99`, `low_stock → 3`, `out_of_stock → 0`). Decide in design phase; for now, assume the data layer exposes a numeric count (likely already present — `getStockLevel` probably returns the quantity too).
- **Drawer and page duplication**: mitigated by `CartLineItem`, `CartSummary`, `EmptyCart` shared components. Tests target components, not surfaces.
- **Toast + drawer both opening**: can feel noisy. Recommend drawer opens, sonner toast STAYS (short 1.5s, less intrusive) — both are confirmatory; drawer is primary.
- **Race between `openCart` and Sheet's enter animation**: Base UI Dialog handles this; no action needed.

### Ready for Proposal

**Yes.** Clear scope, known architecture, known primitives. Proposal should adopt Approach 3 with the decisions above.
