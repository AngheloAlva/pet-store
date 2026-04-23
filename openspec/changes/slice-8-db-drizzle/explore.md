# Exploration: Slice 8 — Migrate seed data to PostgreSQL (Neon) + Drizzle ORM

## Current State

Phase 1 is complete. All data lives in in-memory TypeScript arrays under `src/data/*`. Data access is
abstracted through a thin helper layer in `src/lib/` (catalog, stores, stock). The UI never reaches
directly into `src/data/` except for a few leaks described below.

### Seed files and row counts

| File | Export | Rows | Type |
|------|--------|------|------|
| `src/data/brands.ts` | `brands` | 10 | `Brand[]` |
| `src/data/categories.ts` | `categories` | 17 | `Category[]` |
| `src/data/products.ts` | `products` | ~40 | `Product[]` |
| `src/data/stores.ts` | `stores` | 4 | `Store[]` |
| `src/data/stock.ts` | `stockExceptions`, `getStockLevel()` | ~35 exceptions | Sparse override model |

### Relational table mapping

| Seed entity | DB table | Notes |
|-------------|----------|-------|
| `Brand` | `brands` | Flat. Logo is an embedded `Image` object → needs normalizing or stored as JSONB |
| `Category` | `categories` | Self-referencing (parentId). `order` column for display sort |
| `Product` | `products` | Core row only — no variants/images/tags inline |
| `ProductVariant` | `product_variants` | Embedded array on Product → separate table with FK |
| `Image` (product) | `product_images` | Embedded array on Product → separate table with FK |
| `ProductTag` | `product_tags` | string union array → junction or enum column array |
| `Product.species` | `product_species` | string union array → junction or pg array |
| `Product.categoryIds` | `product_categories` | many-to-many junction |
| `Product.targetSize` | `product_sizes` | nullable array → junction or pg array |
| `Store` | `stores` | Core row only |
| `StoreService` | `store_services` | array → junction or pg array |
| `StoreSchedule` | `store_schedules` or JSONB | Composite object (weekdays/saturday/sunday) |
| `StockLevel` | `stock_levels` | sparse — currently only exceptions stored; DB stores all (variantId FK, storeId FK) |

### Current `src/lib/` abstraction layer — access patterns

**`src/lib/catalog.ts`** (queries products, brands, categories):
- `getFeaturedProducts(limit?)` — filter by `featured`
- `getTopLevelCategories()` — filter by `parentId === null`
- `getBrand(brandId)` — lookup by id
- `getProductBySlug(slug)` — lookup by slug
- `getCategoryById(id)` / `getCategoryBreadcrumb(id)` — lookup + chain walk
- `getCategoryTree()` — tree structure
- `getCategoryWithDescendants(slug)` — slug + first-level children slugs
- `getRelatedProducts(product, limit)` — scored similarity join
- `getAllBrands()` — sorted list
- `queryProducts(CatalogQuery)` — full filter+sort+paginate (main catalog query)
- `getSpeciesInUse()` / `getPriceRange()` — aggregates
- `getTagMeta()`, `TAG_FILTER_OPTIONS`, `SORT_OPTIONS`, `PRICE_PRESETS` — static UI constants (no data dep)

**`src/lib/stores.ts`** (queries stores):
- `getStoreBySlug(slug)` — single store lookup
- `getStoresCommuneSummary()` — string join of communes
- `getStoresByService(service)` — filter by service

**`src/lib/stock.ts`** (queries stock by variant+store):
- `getProductStockMatrix(variantId)` — joins all stores with stock status
- `isVariantGloballyOutOfStock(variantId)` — aggregate check
- `getVariantTotalStock(variantId)` — numeric sum

### Direct `@/data` imports that bypass the lib layer (leaks)

These files import directly from `src/data/` instead of going through `src/lib/`:

| File | Import | Risk |
|------|--------|------|
| `src/app/producto/[slug]/page.tsx` | `products` (for `generateStaticParams`) | Needs `getAllProductSlugs()` helper |
| `src/app/sitemap.ts` | `products` | Needs `getAllProductSlugs()` helper |
| `src/app/sucursales/page.tsx` | `stores` | Needs `getAllStores()` helper |
| `src/lib/stock.ts` | `getStockLevel()` from `@/data/stock` | Internal to lib — acceptable coupling |

Tests also import from `@/data` directly — these are unit test fixtures, acceptable.

---

## Affected Areas

- `src/data/*` — will be replaced/deleted after DB is live
- `src/lib/catalog.ts` — all functions become async DB queries
- `src/lib/stores.ts` — all functions become async DB queries
- `src/lib/stock.ts` — queries from DB instead of sparse exception model
- `src/app/producto/[slug]/page.tsx` — needs new `getAllProductSlugs()` from lib
- `src/app/sitemap.ts` — same
- `src/app/sucursales/page.tsx` — needs `getAllStores()` from lib
- `src/db/schema.ts` — NEW: Drizzle schema definitions
- `src/db/index.ts` — NEW: DB client singleton
- `src/db/seed.ts` — NEW: seed script from existing data files
- `drizzle.config.ts` — NEW: drizzle-kit config
- `.env.local` — NEW: `DATABASE_URL`

---

## Type System Normalization Required

### Arrays embedded in Product (need relational decomposition)

| TS field | Current | DB approach |
|----------|---------|-------------|
| `Product.variants: ProductVariant[]` | Embedded array | Separate `product_variants` table |
| `Product.images: Image[]` | Embedded array | Separate `product_images` table |
| `Product.categoryIds: string[]` | Array of IDs | Junction `product_categories` |
| `Product.species: Species[]` | Union string array | PG `text[]` array column or junction |
| `Product.tags: ProductTag[]` | Union string array | PG `text[]` array column (small, bounded set) |
| `Product.targetSize?: Size[]` | Nullable union array | PG `text[]` nullable column |

### Embedded objects requiring normalization

| TS field | DB approach |
|----------|-------------|
| `ProductVariant.quantity: Quantity` | Two columns: `quantity_value numeric`, `quantity_unit text` |
| `ProductVariant.price: Money` | Two columns: `price_amount integer`, `price_currency text` (always CLP) |
| `ProductVariant.compareAtPrice?: Money` | Same, nullable |
| `Brand.logo?: Image` | JSONB column or separate columns (`logo_url`, `logo_alt`) |
| `Store.coordinates: Coordinates` | Two columns: `lat numeric`, `lng numeric` |
| `Store.schedule: StoreSchedule` | JSONB column (weekdays/saturday/sunday strings — no query need) |
| `Store.services: StoreService[]` | PG `text[]` or junction (small bounded set — array preferred) |

### Stock model

Currently: "all variants at all stores are in_stock by default; only exceptions stored." 
DB: Explicit `stock_levels` table with `(variant_id, store_id)` composite PK and `status` enum.
Seed script must cross-join all variant×store combinations, defaulting to `in_stock`, then apply the exceptions.

---

## Approaches

### 1. Big Bang — Full migration in one slice

Implement everything in slice 8: schema, migrations, seed, async lib layer, fix all leaks.

- **Pros**: Clean break. DB is canonical from slice 8 onward. No dual-mode complexity. Tests stay green.
- **Cons**: Larger PR. Risk: if any query is wrong, everything breaks simultaneously.
- **Effort**: High (but scoped — no new UI, pure infrastructure)

### 2. Table-by-table — Migrate one entity at a time

Migrate brands → categories → products → stores → stock across separate slices, keeping seed as fallback.

- **Pros**: Smaller PRs. Easier to bisect if something breaks.
- **Cons**: Dual-mode complexity (both data sources live together). UI callers need conditional logic. Higher total effort. More slices.
- **Effort**: Medium per slice, High total

### 3. Big Bang with feature flag

Implement full schema + seed in slice 8. New lib functions call DB. Toggle with `USE_DB=true` env var during development. Fallback to seed if flag is off.

- **Pros**: Safe rollout. Can test against real DB without breaking demo.
- **Cons**: Extra complexity of flag; dead code after promotion.
- **Effort**: High (slightly more than pure big bang)

---

## Recommendation

**Approach 1 — Big Bang, single slice.**

Rationale:
1. The abstraction layer (`src/lib/`) is already in place — the UI already calls async-compatible helper functions. Making them async is mechanical.
2. The seed dataset is small (~40 products, 10 brands, 17 categories, 4 stores, ~35 stock exceptions). Seed script is a one-evening job.
3. Table-by-table adds coordination overhead that outweighs safety benefits for a dataset this size.
4. There is no production traffic. Breaking changes cost zero downtime risk.
5. The `src/lib/` functions will need `async/await` added — that change must be consistent across all callers anyway. Doing it piecemeal creates more merge conflicts.

The slice scope is: schema → migrations → seed → async lib → fix leaks → update tests.

---

## Driver Choice: `@neondatabase/serverless` (neon-http)

**Recommended:** `drizzle-orm/neon-http` with `@neondatabase/serverless`

| Driver | Mode | When to use |
|--------|------|-------------|
| `drizzle-orm/neon-http` | HTTP (stateless) | RSC, Route Handlers — no TCP, no WebSocket, edge-compatible |
| `drizzle-orm/neon-serverless` | WebSocket | Interactive transactions, session mode |
| `drizzle-orm/node-postgres` (`pg`) | TCP | Long-lived Node server (not Vercel/Next RSC serverless) |

Next.js 16 App Router RSC runs in Node.js serverless functions on Vercel. Each invocation is stateless. HTTP driver (`neon-http`) is the right choice: no connection pool to manage, lowest cold start latency, works in both Node runtime and edge runtime.

For interactive transactions (needed in Fase 2 checkout): switch to `neon-serverless` WebSocket mode **only for those routes**. Not needed for slice 8 (read-only queries).

---

## Risks

1. **`src/lib/` functions become async** — All RSC call sites (`page.tsx`) must `await` them. This is mechanical but touches many files.
2. **`generateStaticParams` in `/producto/[slug]`** — Currently pulls `products` array at build time. After migration, must call an async DB function from a static context. Neon HTTP supports this (no WebSocket needed at build time).
3. **Env var at build time** — `DATABASE_URL` must be available in the Vercel build environment. If not set, `drizzle-kit generate` and the seed script will fail. Must document `.env.local` setup.
4. **PG array columns vs. junction tables for `species` and `tags`** — Arrays are simpler and sufficient for bounded sets (7 species, 6 tags). But they are harder to query with complex filters. Since `queryProducts` already does in-app filtering today, PG array overlap operators (`&&`) are adequate. Junction tables are over-engineering for this use case.
5. **Stock model change** — Moving from sparse exceptions to full cross-join table means the seed script must be careful to generate all `variant_id × store_id` combos correctly. Easy to get wrong with a naive loop.
6. **Test suite** — Current unit tests (`vitest`) import from `@/data` directly. After migration, tests need to mock the DB or switch to integration tests. This is the highest-effort ancillary task.
7. **Connection singleton** — Drizzle's HTTP client is stateless (one SQL call per request). No pooling needed, but the `drizzle` instance should be created once per module (module-level singleton in `src/db/index.ts`), not per request.
8. **`FASE_2.md` references "Prisma or Drizzle"** — User has decided Drizzle. Doc update needed (tracked in `docs/FASE_2.md`).

---

## Ready for Proposal

Yes. Exploration is complete. The scope is well-defined, the risks are identified, and the recommended approach is clear.

The proposal should specify:
- Exact schema (tables, columns, types, relations)
- Drizzle-kit config and migration workflow
- Seed script strategy
- Async lib migration pattern
- Leak fixes
- Test strategy
