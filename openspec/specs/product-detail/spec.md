# Product Detail Specification

## Purpose

Defines the behavior of `/producto/[slug]`: how a product is rendered, how variants drive price and stock, how the user adds to cart, and how the route is statically generated and discovered.

## Requirements

### Requirement: Route Resolution and SSG

The system MUST statically prerender one page per product slug. `generateStaticParams` MUST call `getAllProductSlugs(): Promise<string[]>` from `src/lib/catalog.ts` to fetch slugs asynchronously. Unknown slugs MUST render the 404 page.
(Library function returns async; internals currently read from seed data with TODO markers for future Drizzle query swap.)

#### Scenario: Valid slug renders SSR

- GIVEN a product with slug `royal-canin-medium-adult` exists in the data
- WHEN a user opens `/producto/royal-canin-medium-adult`
- THEN the product's gallery, breadcrumb, purchase panel, tabs, and related products render server-side

#### Scenario: Unknown slug is 404

- GIVEN no product has slug `bogus-slug`
- WHEN a user opens `/producto/bogus-slug`
- THEN the dedicated not-found page renders and the response status is 404

### Requirement: Dynamic Metadata

The system MUST emit page metadata derived from the product. `title` MUST be the product name; `description` SHOULD be the short description (or the first 160 chars of description); `openGraph.images` MUST include the first product image.

#### Scenario: Metadata for an existing product

- GIVEN product `Royal Canin Medium Adult`
- WHEN metadata is generated
- THEN `title` is `"Royal Canin Medium Adult"` and `openGraph.images[0].url` equals `product.images[0].url`

### Requirement: Breadcrumb

The PDP MUST render a breadcrumb with `Home` → top-level category name → product name. The product name crumb MUST be non-interactive (current page).

#### Scenario: Breadcrumb for a dog food

- GIVEN a product with `categoryIds: ["alimentos-perros"]`
- WHEN the page renders
- THEN the breadcrumb shows `Inicio / Perros / Royal Canin Medium Adult`

### Requirement: Default Variant Selection

On first render the first variant MUST be selected. Price, stock matrix, and add-to-cart payload all key off the selected variant.

#### Scenario: First variant is selected

- GIVEN a product with 3 variants (3 kg, 8 kg, 15 kg)
- WHEN the page renders
- THEN the "3 kg" toggle is active and its price is shown

### Requirement: Variant Change Updates Price and Stock

Clicking a variant toggle MUST update: the displayed price, compareAt strike + discount badge, and the stock matrix rows.

#### Scenario: Switching variant updates price

- GIVEN variants `{3 kg: 24990, 8 kg: 49990, 15 kg: 79990/compareAt 89990}`
- WHEN the user clicks `15 kg`
- THEN the displayed price is `$79.990`, the strike-through shows `$89.990`, and a badge shows `-11%`

### Requirement: Stock Matrix by Store

For each store fetched via `getAllStores()`, the PDP MUST show a row with the store name and a status label for the currently selected variant. Status values MUST be one of: "Disponible" (in_stock), "Últimas unidades" (low_stock), "Sin stock" (out_of_stock).
(Store and stock data fetched asynchronously; internals currently read from seed data with TODO markers for future Drizzle query swap.)

#### Scenario: Out-of-stock variant in one store

- GIVEN variant `rc-ma-15` is out_of_stock in `maipu`
- WHEN the user selects that variant
- THEN the Maipú row shows "Sin stock" with the destructive tone

### Requirement: Quantity Stepper

The quantity input MUST accept integers in `[1, 99]`. Increment / decrement buttons MUST clamp at bounds; the plus button MUST be disabled at 99, the minus button disabled at 1.

#### Scenario: Lower bound

- GIVEN quantity is 1
- WHEN the user clicks the minus button
- THEN quantity stays at 1 and the minus button is disabled

### Requirement: Add To Cart

Clicking "Agregar al carrito" MUST call the cart store with payload `{ productId, variantId, name, variantName, image, unitPrice, slug, quantity }` using the currently selected variant and quantity. A success toast MUST be shown. If the variant is out_of_stock in every store, the button MUST be disabled.

#### Scenario: Happy path

- GIVEN variant `rc-ma-8` selected, quantity 3
- WHEN the user clicks "Agregar al carrito"
- THEN the cart gains an item with `quantity=3` and the header cart badge increments by 3
- AND a toast confirms the addition

#### Scenario: Globally out-of-stock variant

- GIVEN a variant marked `out_of_stock` in all stores
- WHEN the PDP renders with that variant selected
- THEN the "Agregar al carrito" button is disabled

### Requirement: Related Products

The PDP MUST render up to 4 related products. Relation priority: same primary category > same species > same brand. The current product MUST be excluded.

#### Scenario: 4 related rendered

- GIVEN more than 4 products share the primary category of the current product
- WHEN the page renders
- THEN exactly 4 related `ProductCard` entries appear, none being the current product

### Requirement: Info Tabs

The system MUST render tabs for Description, Ingredients, and Nutritional Analysis. A tab whose content is absent in the data MUST be hidden.

#### Scenario: Nutrition hidden when empty

- GIVEN a product without `nutritionalAnalysis`
- WHEN the tabs render
- THEN only Description and Ingredients tabs are shown

### Requirement: Mobile Sticky CTA

On viewports below the `md` breakpoint the PDP MUST render a sticky bottom bar with the current variant's price and an "Agregar" button that wires to the same add-to-cart action.

#### Scenario: Mobile sticky CTA dispatches add

- GIVEN a mobile viewport
- WHEN the user taps the sticky "Agregar" button
- THEN the same cart payload is dispatched as the desktop button

### Requirement: Async Product Data Access

`src/lib/catalog.ts` MUST export `getAllProductSlugs(): Promise<string[]>` backed by async functions that coordinate with the data layer. No file under `src/app/**` MAY query product data directly or import from `src/data/*`.
(Library function returns async signature; internals currently read from seed data with TODO markers for future Drizzle query swap.)

#### Scenario: getAllProductSlugs returns slug for each product

- GIVEN the data seed with N products
- WHEN `getAllProductSlugs()` is awaited
- THEN an array of exactly N slug strings is returned

#### Scenario: Sitemap uses getAllProductSlugs

- GIVEN `src/app/sitemap.ts` imports `getAllProductSlugs` from `src/lib/catalog.ts`
- WHEN the sitemap is generated at build
- THEN one entry per product slug is included with no direct data layer imports
