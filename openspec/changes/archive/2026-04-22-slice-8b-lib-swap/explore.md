# Exploration: slice-8b-lib-swap — Replace `@/data` with Drizzle queries

## Current State

The three lib files (`catalog.ts`, `stores.ts`, `stock.ts`) have a two-layer design:

- **Async wrappers** (RSC-ready): `getAllProductSlugs`, `getAllBrandsAsync`, `getProductBySlugAsync`, `getFeaturedProductsAsync`, `getRelatedProductsAsync`, `getAllStores`, `getStoreBySlugAsync`, `getProductStockMatrixAsync`, `isVariantGloballyOutOfStockAsync`, `getVariantTotalStockAsync`
- **Sync helpers** (non-RSC, pure derivation): `getFeaturedProducts`, `getTopLevelCategories`, `getBrand`, `getMinPrice`, `getPrimaryVariant`, `getAllBrands`, `getProductBySlug`, `getCategoryById`, `getCategoryBreadcrumb`, `getRelatedProducts`, `getCategoryTree`, `getCategoryWithDescendants`, `getSpeciesInUse`, `getPriceRange`, `queryProducts`, `getStoreBySlug`, `getStoresCommuneSummary`, `getStoresByService`, `getProductStockMatrix`, `isVariantGloballyOutOfStock`, `getVariantTotalStock`
- **Pure constants** (no data access): `PAGE_SIZE`, `SORT_OPTIONS`, `PRICE_PRESETS`, `getTagMeta`, `TAG_FILTER_OPTIONS`, `SPECIES_LABELS`, `DEFAULT_MAP_VIEWPORT`, `STORE_SERVICE_META`, `STATUS_TO_UNITS`, `StockRow` type

All async wrappers currently do `Promise.resolve(/* sync in-memory op */)` — they read from module-level arrays imported from `src/data/*`.

The DB schema is **normalized** (6 tables: `brands`, `categories`, `products`, `productCategories`, `productImages`, `productVariants`, `stores`, `stockLevels`) while the TS types are **nested** (`Product.variants[]`, `Product.images[]`, `Product.categoryIds[]`). Drizzle `relations()` are fully defined in `schema.ts`, making the relational query API available.

## Affected Areas

- `src/lib/catalog.ts` — all async wrappers + `queryProducts` sync fn must be replaced
- `src/lib/stores.ts` — all async wrappers must be replaced
- `src/lib/stock.ts` — all async wrappers must be replaced; sync helpers can delegate to async via `.then()` or await in an internal util
- `src/data/*` — to be deleted at the end (5 files: `brands.ts`, `categories.ts`, `products.ts`, `stores.ts`, `stock.ts`, `index.ts`)
- `src/test/fixtures/index.ts` — currently re-exports from `@/data/*`; must be updated to inline static JSON or TypeScript constants before deletion
- `src/lib/catalog.test.ts`, `src/lib/stock.test.ts`, `src/lib/stores.test.ts` — import `from "@/data"` for test assertions; must switch to fixtures or inline data
- All other test files importing `from "@/data"`: `src/components/product/product-stock-list.test.tsx`, `src/app/sitemap.test.ts`, `src/app/sucursales/store-locator.test.tsx`, `src/components/stores/store-map.test.tsx`, `src/app/producto/[slug]/page.test.ts`, `src/components/product/related-products.test.tsx`, `src/components/product/add-to-cart-button.test.tsx`, `src/components/product/product-purchase-panel.test.tsx`, `src/components/product/product-breadcrumb.test.tsx`, `src/components/product/product-info-tabs.test.tsx`, `src/components/product/mobile-sticky-cta.test.tsx`, `src/components/product/product-price.test.tsx`

## Function Inventory

### catalog.ts

| Function | Sync/Async | Shape | Strategy |
|---|---|---|---|
| `getAllProductSlugs()` | async | list | `db.query.products.findMany({ columns: { slug: true } })` → `.map(r => r.slug)` |
| `getAllBrandsAsync()` | async | list | `db.query.brands.findMany({ orderBy: [asc(brands.name)] })` → map to `Brand` |
| `getProductBySlugAsync(slug)` | async | single | `db.query.products.findFirst({ where: eq(products.slug, slug), with: { variants, images, productCategories } })` → map |
| `getFeaturedProductsAsync(limit?)` | async | list | `db.query.products.findMany({ where: eq(products.featured, true), with: { variants, images, productCategories }, limit })` → map |
| `getRelatedProductsAsync(product, limit)` | async | list+score | fetch by categoryIds/species/brandId with `inArray`, score in-memory, slice |
| `getFeaturedProducts(limit?)` | sync | list | **STAYS SYNC** — remove (duplicate of async). Call-site in `popular-products.tsx` must switch to `getFeaturedProductsAsync` |
| `getTopLevelCategories()` | sync | list | **STAYS SYNC** — fetch all categories once via cache, filter in-memory |
| `getBrand(brandId)` | sync | single | **STAYS SYNC** — used in `product-card.tsx` (RSC) and `sortProducts()` internal |
| `getMinPrice(product)` | sync | scalar | **STAYS SYNC** — pure computation on already-fetched `Product`, no data read |
| `getPrimaryVariant(product)` | sync | single | **STAYS SYNC** — pure derivation |
| `getAllBrands()` | sync | list | **STAYS SYNC** — needs shared in-memory cache of brands (see caching below) |
| `getProductBySlug(slug)` | sync | single | **STAYS SYNC** — used in tests for fixtures; after data migration, tests switch to async |
| `getCategoryById(id)` | sync | single | **STAYS SYNC** — pure lookup from in-memory categories |
| `getCategoryBreadcrumb(categoryId)` | sync | list | **STAYS SYNC** — pure traversal |
| `getRelatedProducts(product)` | sync | list | Keep sync for test fixtures; mark deprecated |
| `getCategoryTree()` | sync | list | **STAYS SYNC** — pure derivation |
| `getCategoryWithDescendants(slug)` | sync | list | **STAYS SYNC** — pure traversal |
| `getSpeciesInUse()` | sync | list | Can stay sync if categories/products are pre-fetched; or make async |
| `getPriceRange()` | sync | scalar | Must become async (needs all variants from DB) |
| `queryProducts(query)` | sync | paginated list | **MUST BECOME ASYNC** — see hybrid query section below |

### stores.ts

| Function | Sync/Async | Shape | Strategy |
|---|---|---|---|
| `getAllStores()` | async | list | `db.query.stores.findMany()` → map to `Store` (coordinates nesting, schedule JSONB) |
| `getStoreBySlugAsync(slug)` | async | single | `db.query.stores.findFirst({ where: eq(stores.slug, slug) })` → map |
| `getStoreBySlug(slug)` | sync | single | Keep for tests/sync callers; internally call pre-loaded cache |
| `getStoresCommuneSummary()` | sync | string | **STAYS SYNC** — pure derivation from `getAllStores()` cached result |
| `getStoresByService(service)` | sync | list | **STAYS SYNC** — pure filter from cached stores |

### stock.ts

| Function | Sync/Async | Shape | Strategy |
|---|---|---|---|
| `getProductStockMatrixAsync(variantId)` | async | list | `db.query.stockLevels.findMany({ where: eq(stockLevels.variantId, variantId), with: { store: true } })` → map to `StockRow` |
| `isVariantGloballyOutOfStockAsync(variantId)` | async | boolean | Delegate to `getProductStockMatrixAsync` |
| `getVariantTotalStockAsync(variantId)` | async | number | Delegate to `getProductStockMatrixAsync` |
| `getProductStockMatrix(variantId)` | sync | list | Keep for tests; internally use `STATUS_TO_UNITS` derivation |
| `isVariantGloballyOutOfStock(variantId)` | sync | boolean | Keep for tests |
| `getVariantTotalStock(variantId)` | sync | number | Keep for tests — used in `stores/cart.ts` (sync Zustand store), must stay sync |

## Approaches

### 1. Drizzle Relational Query API (`db.query.X.findMany({ with: ... })`)

Drizzle's relational API automatically handles JOINs and returns nested objects matching the defined `relations()` shape. Since schema already has relations defined (`productsRelations`, etc.), this is the primary tool.

- Pros: Clean, type-safe, returns nested objects natively, single SQL query per call, no manual mapping for joins, N+1 avoided
- Cons: Returns Drizzle's inferred shape (not exactly our TS types), so a thin mapper function is still needed for field name differences (`priceAmount` → `price.amount`, `quantityValue` → `quantity.value`, `lat/lng strings` → `coordinates.lat/lng numbers`)
- Effort: Low-Medium (mapping boilerplate is mechanical)

### 2. Multiple Queries + Manual Merge

Fetch products, then fetch related tables with `inArray(table.productId, productIds)`, group in memory.

- Pros: No relations setup needed, explicit
- Cons: Multiple HTTP round-trips on neon-http (each `db.query` = 1 HTTP call), N+1 if not batched, more code
- Effort: Medium-High

### 3. Raw SQL with `json_agg`

Use `db.execute(sql`SELECT ..., json_agg(variants.*) as variants ...`)` to get fully nested JSON in one query.

- Pros: Absolute minimum round-trips
- Cons: Loses type-safety, complex to write and maintain, overkill for this dataset size
- Effort: High

### queryProducts — hybrid filter approach

The current `queryProducts` does: category expansion → in-memory filter → sort by computed min price → paginate. Two options:

**Option A: Full in-memory (post-fetch)**
Fetch all products + variants + categories from DB once (per-request cache), then apply all filters in TypeScript exactly as today.

- Pros: Zero SQL complexity, no changes to filter/sort logic, predictable behavior
- Cons: Fetches ALL products every request (acceptable for Phase 2 with ~30-50 products; unacceptable at 10k+)
- Effort: Low — just replace the data source

**Option B: Hybrid SQL + in-memory post-filter**
Push species, brandId, featured, tags filters to SQL `where`. Fetch a pre-filtered set. Apply price range and category-with-descendants in memory (since category expansion requires knowing descendants).

- Pros: Smaller result set from DB, scales better
- Cons: Requires building dynamic SQL `where`, category expansion still in-memory, price sort still in-memory
- Effort: Medium

**Recommendation: Option A for Phase 2**. The dataset is small (30-50 products), `cache()` deduplicates within a request, and preserving the existing filter/sort logic avoids regression risk. Mark Option B as Phase 3 migration target.

## Schema → Type Field Mismatches

| DB Column | TS Type Field | Mapping Required |
|---|---|---|
| `product_variants.quantity_value` (numeric string) + `quantity_unit` | `ProductVariant.quantity: { value: number; unit: ... }` | `{ value: parseFloat(qv), unit: qu }` |
| `product_variants.price_amount` (integer) + `price_currency` | `ProductVariant.price: Money` | `{ amount: pa, currency: pc as "CLP" }` |
| `product_variants.compare_at_amount` (nullable) + `compare_at_currency` | `ProductVariant.compareAtPrice?: Money` | Conditional |
| `stores.lat` / `stores.lng` (numeric strings) | `Store.coordinates: { lat: number; lng: number }` | `{ lat: parseFloat(lat), lng: parseFloat(lng) }` |
| `stores.schedule` (jsonb) | `Store.schedule: StoreSchedule` | Cast: `s.schedule as StoreSchedule` |
| `brands.logo_url` + `logo_alt` | `Brand.logo?: Image` | `logo_url ? { url, alt } : undefined` |
| `products.nutritional_analysis` (jsonb) | `Product.nutritionalAnalysis?: Record<string, string>` | Cast |
| `product_categories` junction | `Product.categoryIds: string[]` | Extract `pc.categoryId` from `with: { productCategories: true }` |
| `product_images` (sorted by `sort_order`) | `Product.images: Image[]` | Extract `{ url, alt }` from `with: { images: true }` |
| `products.species` (text[]) | `Product.species: Species[]` | Cast `as Species[]` |
| `products.tags` (text[]) | `Product.tags: ProductTag[]` | Cast `as ProductTag[]` |
| `products.target_size` (text[] nullable) | `Product.targetSize?: Size[]` | Conditional cast |

No fields are missing from either side — the schema was clearly derived from the types. All mismatches are naming/nesting conventions, not semantic gaps.

## Caching Strategy

**`react cache()` — recommended for Phase 2.**

The `db.query` calls run per RSC render. `cache()` deduplicates them within a single request tree (no cross-request sharing). This is appropriate because:
- Neon HTTP is stateless, no persistent connection overhead
- Data is mostly static (seed-only for demo)
- `cache()` is already used on `getAllProductSlugs`, `getAllBrandsAsync`, etc.

**`unstable_cache` (Next.js cross-request cache with tags)** — Phase 3 candidate when data changes via admin UI. Not worth the complexity for Phase 2 where data only changes via `pnpm db:seed`.

**Module-level memo** — avoid, breaks per-request isolation in RSC, cannot invalidate.

## Sync vs Async Plan

**Functions that MUST become async (read from DB):**
- All `*Async` functions in all three lib files
- `queryProducts` — must become `queryProductsAsync` or the `catalogo/page.tsx` call must await it

**Functions that can STAY SYNC (pure derivation):**
- `getMinPrice`, `getPrimaryVariant`, `getCategoryBreadcrumb`, `getCategoryWithDescendants`, `getCategoryTree`, `getTagMeta` — these take already-fetched `Product`/`Category` as input, no DB read
- `getStoresCommuneSummary`, `getStoresByService` — derive from `Store[]` already fetched
- `isVariantGloballyOutOfStock`, `getVariantTotalStock` — derive from `StockRow[]` already fetched

**Sync helpers that duplicate async (candidates for removal):**
- `getFeaturedProducts` — identical logic to `getFeaturedProductsAsync`; `popular-products.tsx` calls the sync version; after swap it must use async
- `getAllBrands` — same as `getAllBrandsAsync`
- `getProductBySlug` (sync) — used extensively in tests; keep for test-compat but deprecate for production paths
- `getProductStockMatrix` (sync), `getStoreBySlug` (sync) — same pattern

**Critical: `getVariantTotalStock` (sync) is called from `src/stores/cart.ts` (Zustand store)**. Zustand selectors and `addItem` are sync. This function MUST stay sync or the cart store needs to be rearchitected. Solution: keep the sync version pointing to an in-memory cache that's populated by `getAllStores()` async call once. Alternatively, switch cart to use `STATUS_TO_UNITS["in_stock"]` as a default (optimistic) and only compute real stock from async context. This is an existing design tradeoff to flag.

## Test Fixture Plan

The current tests do `import { products } from "@/data"` to get fixtures for assertions. When `src/data/*` is deleted:

1. **Update `src/test/fixtures/index.ts`** — change imports from `@/data/*` to inline static TS arrays (copy the data). This is the single source of truth for tests AND seed.
2. **Update `seed.ts`** — it already imports from `@/test/fixtures`, so no change needed there.
3. **Update all test files** — change `from "@/data"` to `from "@/test/fixtures"`. This is a mechanical find-replace across 12+ test files.
4. **Stock tests** — `src/lib/stock.test.ts` uses `vi.spyOn(stockData, "getStockLevel")` which mocks `@/data/stock`. After the swap, the async version hits the DB — tests need Vitest's mock for `@/db` OR the sync helpers remain pointing to `@/test/fixtures/stock`. Recommended: keep sync helpers test-only, backed by fixtures; async helpers get integration-tested separately (or just exclude from unit test coverage).

## Risks

- **N+1 on `getRelatedProductsAsync`**: fetches products by score requires multiple queries (or `inArray` on categoryIds, species, brandId). With 30-50 products this is fine; needs a single `db.query.products.findMany({ where: or(...) })` call.
- **`queryProducts` sync→async change breaks `catalogo/page.tsx`**: The page calls it synchronously today. It must `await` it after the swap. Verify all callers.
- **`getVariantTotalStock` called sync in Zustand cart store**: Cannot be made async without rearchitecting the store. Keep sync version backed by fixtures or a pre-populated module-level cache populated from an RSC call.
- **`quantityValue` is a `numeric` string in Drizzle** (returned as string from Neon): must `parseFloat()` before assigning to `Quantity.value: number`.
- **`lat`/`lng` are `numeric` strings in Drizzle**: same issue, must `parseFloat()`.
- **`schedule` is JSONB**: Drizzle returns it as `unknown`; need to cast as `StoreSchedule`. The seed inserts a typed object, so the cast is safe.
- **`react cache()` wraps async functions**: `queryProducts` is currently sync with `cache()` not applied. After making it async, wrap with `cache()` to prevent duplicate DB calls within a single page render.
- **Test isolation**: All unit tests currently work offline (no DB). After the swap, the async functions require a real or mocked DB. The sync helpers (still backed by fixtures) remain unit-testable offline.

## Recommendation

### Query approach per function

| Group | Strategy |
|---|---|
| Products (single, by-slug) | `db.query.products.findFirst({ where: eq(slug), with: { variants, images, productCategories: { with: { category: { columns: { id: true } } } } } })` + mapper |
| Products (list) | `db.query.products.findMany({ with: { variants, images, productCategories } })` + mapper, wrapped in `cache()` |
| `queryProducts` | Fetch all via `getFeaturedProductsAsync()`-style cache call, then apply existing TS filter/sort/paginate in-memory (Option A) |
| `getRelatedProductsAsync` | Single `db.query.products.findMany` with `inArray` on brandId/species/categories, score in-memory |
| Brands | `db.query.brands.findMany()` → map `{ logo_url, logo_alt }` → `{ logo: Image }` |
| Categories | `db.query.categories.findMany()` — flat, no nesting needed |
| Stores | `db.query.stores.findMany()` → map coordinates + schedule cast |
| Stock | `db.query.stockLevels.findMany({ where: eq(variantId, ...), with: { store: true } })` |

### Caching

`react cache()` on all async functions. No `unstable_cache` for Phase 2.

### Sync vs async

- Keep ALL sync helpers — they are used by tests and by non-async call sites (`product-card.tsx`, `cart.ts`, etc.)
- Add async counterparts where they don't exist yet (`queryProductsAsync`)
- Remove the `@/data` imports; the sync helpers get their data from a shared module-level `cache()`-wrapped loader

### Testing

1. Move static data from `src/data/*` to `src/test/fixtures/index.ts` (inline, not re-exported)
2. Update all `from "@/data"` test imports to `from "@/test/fixtures"`
3. Keep sync lib functions pointing to the fixture-backed module cache for unit tests
4. Async lib functions are only tested via integration (or skipped in unit suite)

## Ready for Proposal

Yes. The investigation is thorough enough to spec and implement. The main decision points are already resolved:
- Relational API with `db.query` (Option 1) for all single-entity and list queries
- In-memory filter/sort for `queryProducts` (Option A) for Phase 2
- `react cache()` only caching strategy
- Fixtures moved to `src/test/fixtures/` before `src/data/` deletion
