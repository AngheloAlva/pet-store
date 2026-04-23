# Delta for product-catalog

## MODIFIED Requirements

### Requirement: Default Catalog View

The system MUST render a paginated grid of products at `/catalogo` when no `searchParams` are present. Product data MUST be fetched asynchronously from the Postgres database via `src/lib/catalog.ts`.
(Previously: data fetched synchronously from in-memory `src/data/products.ts` array)

#### Scenario: First visit with no params

- GIVEN a user navigates to `/catalogo`
- WHEN the page renders
- THEN the first 12 products are shown sorted by `relevancia` (featured → bestseller → name)
- AND a result count `"{N} productos"` is displayed
- AND pagination shows page 1 of ⌈total / 12⌉

### Requirement: URL as Single Source of Truth

All filter, sort, and pagination state MUST be encoded in `searchParams`. Reloading or deep-linking any URL MUST restore the same view server-side.

#### Scenario: Deep link restores state

- GIVEN the URL `/catalogo?categoria=perros&marca=royal-canin&orden=precio-asc&page=2`
- WHEN the user opens it in a new tab
- THEN the grid renders filtered by category "perros" and brand "royal-canin", sorted ascending by price, on page 2
- AND the filter UI reflects those selections as checked/selected

#### Scenario: Back button restores prior filter

- GIVEN the user toggles the `especie=cat` filter
- WHEN they press the browser back button
- THEN the URL reverts to the prior state and the grid re-renders accordingly

### Requirement: Multi-Value Filters

The params `categoria`, `especie`, `marca`, and `tag` MUST accept comma-separated values. Within a group values combine with OR; across groups they combine with AND. Filters MUST be applied via Drizzle query clauses against the Postgres DB, not in-memory array operations.
(Previously: filtering done with `.filter()` on in-memory array)

#### Scenario: Cross-group AND, intra-group OR

- GIVEN `/catalogo?especie=dog,cat&tag=sale`
- WHEN the page renders
- THEN only products on sale AND whose species include dog OR cat are shown
- AND the DB query uses `&&` array overlap operator for `species` and `tags` columns

#### Scenario: Category accepts top-level or child slug

- GIVEN `/catalogo?categoria=perros`
- WHEN the page renders
- THEN products whose `product_categories` junction includes `perros` OR any descendant of `perros` are shown

### Requirement: Price Range Filter

The param `precio=min-max` (CLP integers) MUST restrict results to products whose minimum variant price falls within the inclusive range. Price comparison MUST be performed in the DB query against `product_variants.price_amount`.
(Previously: compared against in-memory variant objects)

#### Scenario: Preset range

- GIVEN `/catalogo?precio=0-30000`
- WHEN the page renders
- THEN only products with `min(product_variants.price_amount) ≤ 30000` are shown

### Requirement: Accent-Insensitive Text Search

The param `q` MUST filter products by substring match against `name` and `brand.name`. Both query and haystack MUST be normalized (lowercased, NFD-decomposed, combining marks stripped) before comparison.

#### Scenario: Accent-insensitive match

- GIVEN `/catalogo?q=nunoa`
- WHEN a product named "Ñuñoa Special" exists
- THEN it is included in results
- AND `q=ñuñoa` returns the same results

#### Scenario: Debounced input

- GIVEN a user types in the search box
- WHEN keystrokes occur faster than 250 ms apart
- THEN the URL is NOT updated until input pauses for 250 ms

### Requirement: Sort Options

The param `orden` MUST accept exactly: `relevancia` (default), `precio-asc`, `precio-desc`, `nombre`, `nuevos`. Unknown values MUST fall back to `relevancia`. Sorting MUST be applied as DB `ORDER BY` clauses.
(Previously: sorting done via `.sort()` on in-memory array)

#### Scenario: Price ascending

- GIVEN `/catalogo?orden=precio-asc`
- WHEN results render
- THEN products are sorted by `min(product_variants.price_amount)` ascending via DB query

### Requirement: Pagination

The system MUST paginate at 12 items per page. The `page` param MUST be a 1-based integer. Out-of-range values MUST render an empty result with a link back to page 1. Pagination MUST use DB `LIMIT`/`OFFSET`.
(Previously: pagination sliced from in-memory array)

#### Scenario: Prev/next navigation

- GIVEN the current URL has `page=2` and there are 3 total pages
- WHEN pagination renders
- THEN a `Siguiente` link points to `page=3` and a `Anterior` link points to `page=1`
- AND links preserve all other `searchParams`

### Requirement: Mobile Filter Sheet

On viewports below `md` (768px), filter controls MUST be inside a `Sheet` triggered by a "Filtrar" button. Filter interactions inside the Sheet MUST update the URL without closing the Sheet.

#### Scenario: Filter inside Sheet keeps it open

- GIVEN a user on mobile opens the filter Sheet
- WHEN they toggle a category checkbox
- THEN the URL updates, the grid re-renders under the Sheet, and the Sheet remains open

### Requirement: Empty State

When the query returns zero products, the system MUST render an empty state explaining that no products match and SHOULD offer a "Limpiar filtros" action that navigates to `/catalogo`.

#### Scenario: No matches

- GIVEN filters that match no product in the DB
- WHEN the page renders
- THEN the empty state is shown
- AND clicking "Limpiar filtros" navigates to `/catalogo` with no params
