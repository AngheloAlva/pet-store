# Design: slice-4-carrito

## Decisions

### 1. Drawer state lives in Zustand (NOT local Sheet state)

`CartState` gains `isOpen: boolean`, `openCart()`, `closeCart()`, `setOpen(v: boolean)`. `AddToCartButton` lives under the PDP tree; `CartIndicator` lives in the header; the drawer is mounted at root. They share no parent below `app/layout.tsx`, so a local `useState` cannot be written by multiple triggers. Zustand gives a single source of truth that works from anywhere.

Rejected: React Context (same reach but extra provider + re-render scope), per-component local state (can't be shared), URL param (`?cart=open` survives reload — violates Requirement 1 scenario "drawer does not reopen after reload").

### 2. `partialize` excludes UI state from persist

```ts
persist(
  (set) => ({ ... }),
  {
    name: "simplepet-cart",
    version: 1,
    partialize: (s) => ({ items: s.items }),
  },
)
```

Without `partialize`, `isOpen: true` would rehydrate on reload and the drawer would pop open unsolicited. This is the load-bearing line for Requirement 1 / Scenario "Drawer does not reopen after reload".

### 3. Synthetic per-store stock cap in `getVariantTotalStock`

The data layer (`src/data/stock.ts`) exposes only `StockStatus` buckets — no numeric quantity. To support clamp we synthesize:

| Status | Synthetic units |
|---|---|
| `in_stock` | 99 |
| `low_stock` | 3 |
| `out_of_stock` | 0 |

```ts
// src/lib/stock.ts
const STATUS_TO_UNITS: Record<StockStatus, number> = {
  in_stock: 99,
  low_stock: 3,
  out_of_stock: 0,
};

export function getVariantTotalStock(variantId: string): number {
  return getProductStockMatrix(variantId).reduce(
    (acc, row) => acc + STATUS_TO_UNITS[row.status],
    0,
  );
}
```

Upper bound per variant across the four seed stores: `4 × 99 = 396`. Then the final clamp caps at 99 per line (see helper below) so the user can't add 300 of anything. This is enough for a demo; a real backend would expose numbers.

### 4. Pure helpers in `src/lib/cart.ts`

```ts
export function clampItemQuantity(requested: number, totalStock: number): number {
  if (totalStock <= 0) return 0;
  return Math.max(0, Math.min(requested, totalStock, 99));
}

export function computeCartTotals(items: CartItem[]): {
  subtotal: number;
  shippingLabel: string;
  total: number;
  itemCount: number;
} {
  const subtotal = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  return {
    subtotal,
    shippingLabel: "Se calcula en el checkout",
    total: subtotal,
    itemCount: items.reduce((acc, i) => acc + i.quantity, 0),
  };
}
```

Isolating these keeps the store small and makes them trivially testable under Strict TDD.

### 5. Store calls clamp inside mutations

`addItem` and `updateQuantity` delegate to `clampItemQuantity`. The store looks up `getVariantTotalStock(item.variantId)` on the fly. No cached stock in state — one source of truth.

```ts
addItem: (item, quantity = 1) =>
  set((state) => {
    const total = getVariantTotalStock(item.variantId);
    const existing = state.items.find((i) => sameLine(i, item));
    const currentQty = existing?.quantity ?? 0;
    const nextQty = clampItemQuantity(currentQty + quantity, total);
    if (nextQty === 0) return state; // no-op when no stock
    if (existing) {
      return {
        items: state.items.map((i) =>
          sameLine(i, item) ? { ...i, quantity: nextQty } : i,
        ),
      };
    }
    return { items: [...state.items, { ...item, quantity: nextQty }] };
  }),
```

Rejected: caching `max` per line in the item itself — it goes stale when the catalog changes. Rejected: exposing `getMaxForLine` as a store selector — unnecessary indirection; components that need the cap can call `getVariantTotalStock` directly.

### 6. `CartRoot` + `CartDrawer` structure

```
src/components/cart/
├── cart-root.tsx         # "use client"; mounts CartDrawer. Imported from app/layout.
├── cart-drawer.tsx       # "use client"; controlled Base UI Sheet bound to Zustand.
├── cart-line-item.tsx    # "use client"; shared line UI + stepper + remove.
├── cart-summary.tsx      # "use client"; subtotal/shipping/total + checkout CTA.
└── empty-cart.tsx        # "use client"; icon + CTA to /catalogo.
```

`CartRoot` is a trivial wrapper so `app/layout.tsx` (a Server Component) can include a single client import without marking the whole layout as client.

`CartDrawer` uses Base UI `Dialog` via our wrapper:

```tsx
<Sheet open={isOpen} onOpenChange={setOpen}>
  <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
    <SheetHeader>
      <SheetTitle>Tu carrito</SheetTitle>
      <SheetDescription>{itemCount} {itemCount === 1 ? "producto" : "productos"}</SheetDescription>
    </SheetHeader>
    {items.length === 0 ? <EmptyCart /> : (
      <>
        <ul className="flex-1 overflow-y-auto divide-y">
          {items.map((it) => <CartLineItem key={`${it.productId}:${it.variantId}`} item={it} />)}
        </ul>
        <SheetFooter>
          <CartSummary />
          <Button render={<Link href="/carrito" />} variant="outline" className="w-full">Ver carrito completo</Button>
        </SheetFooter>
      </>
    )}
  </SheetContent>
</Sheet>
```

`Sheet` doesn't need a `SheetTrigger` — we drive it purely by `open` + `onOpenChange`. Base UI `Dialog.Root` already supports controlled mode.

### 7. `/carrito` page structure

```tsx
// src/app/carrito/page.tsx — RSC
import type { Metadata } from "next";
import { CartPageClient } from "./cart-page-client";

export const metadata: Metadata = {
  title: "Carrito",
  description: "Revisa y edita los productos antes de pagar.",
};

export default function CarritoPage() {
  return (
    <Container className="py-8">
      <h1 className="font-heading text-2xl mb-6">Tu carrito</h1>
      <CartPageClient />
    </Container>
  );
}
```

`CartPageClient` reads Zustand, guards with `useHydrated()`, renders `<EmptyCart/>` while hydrating or when empty, otherwise a two-column layout: lines (left) + summary (right, sticky on desktop).

### 8. Hydration pattern

Every client that reads persisted state follows:

```tsx
const hydrated = useHydrated();
const items = useCartStore((s) => s.items);
if (!hydrated) return <CartSkeleton />; // or null for drawer
```

Drawer: `return null` before hydrated (it's closed anyway). Page: skeleton shell (matches `EmptyCart` layout so layout doesn't jump). Header badge: already uses this pattern.

### 9. `CartIndicator` change

From `<Button render={<Link href="/carrito" />}>` to `<Button onClick={openCart}>`. Keeps keyboard behavior (button role), removes a navigation that broke in Slice 3. Direct `/carrito` URL still works via browser address bar / the drawer's "Ver carrito completo" link.

### 10. `AddToCartButton` change

After the `addItem` call (which itself is a no-op when `totalStock === 0`), conditionally call `openCart()` only if the resulting cart has at least one unit of the requested line. Simpler: `openCart()` unconditionally and rely on the drawer to render the empty state — but that'd open an empty drawer on OOS clicks. The button is already `disabled` when OOS, so the real flow never hits that branch. Decision: call `openCart()` unconditionally; the disabled state prevents the empty-drawer edge case.

### 11. Line item UI

- 64×64 thumb (`next/image` fill, `sizes="64px"`, rounded).
- Name linking to `/producto/{slug}` with `text-sm font-medium`.
- Variant name `text-xs text-muted-foreground`.
- `QuantityStepper` rebound: value + onChange read/write via `updateQuantity`. Pass `max` from `getVariantTotalStock`. Stepper doesn't currently accept a `max` prop — we'll add one (optional, defaults to 99).
- Line total `tabular-nums font-medium`.
- Remove control: `<Button variant="ghost" size="icon-sm" aria-label={`Quitar ${name} del carrito`}>` with `<XIcon/>`.

### 12. Tests (Strict TDD)

Test pairs:
1. `src/lib/cart.test.ts` — `clampItemQuantity`, `computeCartTotals` (RED → GREEN).
2. `src/lib/stock.test.ts` — `getVariantTotalStock` (RED → GREEN; extend existing file).
3. `src/stores/cart.test.ts` — `isOpen`, `openCart`, `closeCart`, `setOpen`, `addItem` with clamp, `updateQuantity` with clamp, `persist` partialize (verify serialized shape).
4. Component tests (RTL):
   - `empty-cart.test.tsx` — renders CTA to `/catalogo`.
   - `cart-summary.test.tsx` — subtotal/shipping label/total/disabled CTA/"Próximamente".
   - `cart-line-item.test.tsx` — stepper updates qty, remove button calls store, a11y label.
   - `cart-drawer.test.tsx` — open-by-store, ESC closes, renders EmptyCart when empty, SheetTitle present.
   - `cart-root.test.tsx` — renders drawer.
   - `cart-page-client.test.tsx` — hydration guard renders skeleton first.
   - `cart-indicator.test.tsx` — updated to click → `openCart`.
   - `add-to-cart-button.test.tsx` — updated to verify `openCart` called.

### 13. Out-of-scope guardrails

- No `/checkout` route. CTA disabled with `Próximamente` helper text.
- No toast removal — keep sonner call in `AddToCartButton`; shorten duration via `{ duration: 1500 }` to avoid visual clutter with the drawer.

## Open Questions

None blocking. `/checkout` destination is deferred to a later slice.

## Migration / Rollback

No data migration. `localStorage` key unchanged. On rollback: `git revert` of the slice commit fully reverts. Any stuck `isOpen: true` from a dev session that predates `partialize` is wiped automatically because the persisted payload no longer has that key.
