# Capability: cart

**Status**: NEW (introduced by change `slice-4-carrito`).
**Surface**: Zustand store (`src/stores/cart.ts`), cart drawer (global), `/carrito` page, shared components in `src/components/cart/*`.

## Requirement 1 — Cart Persistence

The cart MUST persist its `items` array across page reloads via `localStorage` under the key `simplepet-cart`. UI state (drawer open flag, any transient selection) MUST NOT be persisted.

### Scenario: Items survive reload
- **Given** the cart has two line items
- **When** the user reloads the page
- **Then** the header badge, `/carrito` page, and drawer show the same two line items with the same quantities

### Scenario: Drawer does not reopen after reload
- **Given** the cart drawer is open
- **When** the user reloads the page
- **Then** the drawer is closed on the fresh session

## Requirement 2 — Add to Cart With Stock Clamp

Adding a line MUST clamp the effective quantity to `min(requested, totalStock, 99)`. `totalStock` is derived from `getVariantTotalStock(variantId)` which sums a synthetic per-store cap (`in_stock → 99`, `low_stock → 3`, `out_of_stock → 0`) across all stores.

### Scenario: Add respects stock cap
- **Given** a variant with `totalStock = 5` and an empty cart
- **When** the user requests to add 10 units
- **Then** the cart contains one line with `quantity = 5`

### Scenario: Add increments existing line within cap
- **Given** a cart with one line at `quantity = 4` and `totalStock = 5`
- **When** the user adds 3 more of the same variant
- **Then** the line's `quantity = 5` (not 7)

### Scenario: Add of fully out-of-stock variant is a no-op
- **Given** a variant with `totalStock = 0`
- **When** add-to-cart is invoked
- **Then** the cart is unchanged

## Requirement 3 — Update Quantity

Updating the quantity of a line MUST apply the same clamp as add. A request of `≤ 0` MUST remove the line.

### Scenario: Update clamps to stock
- **Given** a line with `quantity = 2` and `totalStock = 3`
- **When** the user sets quantity to 9
- **Then** the line's quantity is `3`

### Scenario: Update to zero removes the line
- **Given** a line with `quantity = 2`
- **When** the user sets quantity to 0
- **Then** the cart no longer contains that line

## Requirement 4 — Remove Line Item

Clicking the remove control on a line MUST delete that specific `(productId, variantId)` line without affecting other lines.

### Scenario: Remove single line
- **Given** a cart with three lines A, B, C
- **When** the user removes line B
- **Then** the cart has exactly A and C with unchanged quantities

## Requirement 5 — Clear Cart

A `clear()` action MUST empty the `items` array. (No UI surface is required this slice; the action stays exposed for tests and future checkout.)

### Scenario: Clear empties cart
- **Given** a cart with at least one line
- **When** `clear()` is invoked
- **Then** `items.length === 0` and the empty state renders on both surfaces

## Requirement 6 — Drawer Open Triggers

The cart drawer MUST open when (a) the user successfully adds at least one unit via `AddToCartButton`, and (b) the user activates the header cart indicator. It MUST NOT open on page load, route change, or store hydration.

### Scenario: Add-to-cart opens drawer
- **Given** a PDP with an in-stock variant
- **When** the user clicks "Agregar al carrito"
- **Then** the drawer opens showing the new line at the top

### Scenario: Header icon opens drawer
- **Given** any page on the site
- **When** the user clicks the cart icon in the header
- **Then** the drawer opens

### Scenario: Add of out-of-stock variant does not open drawer
- **Given** a variant with `totalStock = 0`
- **When** the user clicks "Agregar al carrito" (button is disabled, but if invoked programmatically)
- **Then** the drawer stays closed

## Requirement 7 — Shared Surfaces

The drawer and `/carrito` page MUST render the same `CartLineItem`, `CartSummary`, and `EmptyCart` components. Both surfaces MUST read from the same Zustand store.

### Scenario: Edits from drawer reflect on page
- **Given** the cart drawer is open with a line at `quantity = 2`
- **When** the user increments quantity to 3 in the drawer and navigates to `/carrito`
- **Then** `/carrito` shows `quantity = 3` for that line

### Scenario: Edits from page reflect on next drawer open
- **Given** the user removed a line on `/carrito`
- **When** the drawer is opened from any page
- **Then** that line is absent

## Requirement 8 — Totals

Both surfaces MUST display: `Subtotal` (sum of `unitPrice × quantity`), `Despacho: "Se calcula en el checkout"` (label only), and `Total` equal to `Subtotal`. All monetary values formatted via `formatCLP` (es-CL, CLP, no decimals).

### Scenario: Subtotal updates on quantity change
- **Given** a cart with one line at `unitPrice = 4990` and `quantity = 2`
- **When** the user increments the quantity to 3
- **Then** the subtotal and total both read `$14.970`

### Scenario: Shipping label is static
- **Given** any non-empty cart
- **When** the summary is rendered
- **Then** the shipping row shows the text "Se calcula en el checkout" and no amount

## Requirement 9 — Checkout CTA Disabled

Both surfaces MUST render a primary "Ir al checkout" button in a disabled state with accompanying helper text "Próximamente". No navigation occurs on click.

### Scenario: Checkout button is disabled
- **Given** a non-empty cart on either surface
- **When** the user attempts to click the checkout button
- **Then** no navigation happens and the helper text "Próximamente" is visible near the button

## Requirement 10 — Accessibility

The drawer MUST trap focus while open, close on `Escape`, close on backdrop click, expose a labeled title (`SheetTitle` = "Tu carrito") and description for screen readers. Remove, stepper, and checkout controls MUST have accessible names.

### Scenario: Escape closes drawer
- **Given** the drawer is open
- **When** the user presses Escape
- **Then** the drawer closes and focus returns to the trigger

### Scenario: Remove button has accessible label
- **Given** a line for "Pro Plan Adulto 15kg"
- **When** a screen reader focuses the remove control
- **Then** it announces "Quitar Pro Plan Adulto 15kg del carrito"

## Requirement 11 — Hydration Safety

Every client surface reading persisted state MUST render a stable, non-item-dependent tree on SSR and on first client render until `useHydrated()` returns true. No hydration mismatch warnings may appear in the console.

### Scenario: /carrito SSR shell
- **Given** the server renders `/carrito`
- **When** the initial HTML is produced
- **Then** a neutral skeleton or empty shell is returned (no cart items in server HTML)

### Scenario: Header badge hidden until hydrated
- **Given** the user has one persisted cart item
- **When** the page first loads
- **Then** the badge is absent on the server HTML and appears once hydration completes
