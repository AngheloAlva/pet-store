# Exploration: slice-2-catalogo

## Current State

The catalog route exists only as a stub at `src/app/catalogo/page.tsx` (placeholder from Slice 0). The home page already consumes products through `src/lib/catalog.ts` helpers (`getFeaturedProducts`, `getTopLevelCategories`, `getBrand`, `getMinPrice`, `getTagMeta`) and renders them with `src/components/product/product-card.tsx`. All data is static in `src/data/*.ts`:

- **44 products** with: `brandId`, `categoryIds[]`, `species[]`, `lifeStage?`, `targetSize?`, `tags[]`, `variants[]` (with `price`, `compareAtPrice?`), `featured?`.
- **17 categories** hierarchical (3 top-level: Perros / Gatos / Exóticos + 14 children).
- **10 brands**.
- **6 species** in use (dog, cat, bird, fish, reptile, small_pet).
- **7 tag values** in use (bestseller, sale, exclusive, natural, grain-free, new, plus untagged).
- **Stock**: default `in_stock` with exception list per (variantId, storeId).

Home already passes category filter to catalog via `/catalogo?categoria={slug}` (wired in `FeaturedCategories`). The URL convention is established.

## Affected Areas

- `src/app/catalogo/page.tsx` — replace stub with RSC that reads `searchParams`, queries products, renders grid.
- `src/lib/catalog.ts` — add `queryProducts({ filters, sort, page })` port; add `getAllBrands`, `getSpeciesInUse`, `getCategoryTree`, `getPriceRange` helpers for filter UI.
- `src/components/catalog/` (NEW) — `catalog-filters.tsx` (client), `catalog-toolbar.tsx` (client, sort + result count + mobile filter trigger), `catalog-grid.tsx` (RSC or plain), `catalog-pagination.tsx` (RSC, builds links).
- `src/components/product/product-card.tsx` — no change (already handles the shape we need).
- Optional: `src/lib/url-params.ts` — parse/serialize helpers for the `searchParams` shape.

## Approaches

### 1. Filter state: pure URL `searchParams` (RSC page reads them, filter UI is a client island that updates URL)

- **Pros**:
  - Shareable links, back/forward works for free.
  - Server renders the filtered grid → fast first paint, SEO-friendly product listings per filter combo.
  - No state duplication between URL and client state.
  - Zero dependency on client-side JS for the grid rendering.
- **Cons**:
  - Client filter UI must sync with URL via `useRouter().replace()` on every change — needs debouncing for search input.
  - RSC re-renders on each filter change = small latency even though data is local.
- **Effort**: Medium.

### 2. Filter state: client-only (Zustand or `useState` in a top-level client component)

- **Pros**:
  - Instant filter response, no server round-trip.
  - Simpler code for the filter UI.
- **Cons**:
  - Not shareable. Back/forward doesn't work.
  - Entire catalog tree becomes a client component → larger bundle, no SSR benefit for SEO.
  - Conflicts with the URL convention already seeded from the home (`?categoria=`).
- **Effort**: Low, but **architecturally wrong** for an e-commerce catalog.

### 3. Hybrid: URL for canonical state, local state for optimistic UI

- **Pros**:
  - Snappy filter clicks (optimistic update) with canonical URL reflecting reality.
- **Cons**:
  - Complexity overhead is not justified at 44 products. Filtering locally is sub-millisecond; there's no UX benefit.
- **Effort**: High.

### Search: substring vs fuzzy

- **Substring + normalization** (lowercase + accent-strip): trivial, works for 44 items, predictable. Zero deps.
- **Fuse.js / MiniSearch**: useful at 1000+ products or for typo tolerance. Overkill here.
- **Recommendation**: substring. If users complain, swap the implementation inside `queryProducts` without touching the UI contract.

### Sort options

- `relevance` (default): `featured` first → `tags.includes("bestseller")` → name.
- `price-asc` / `price-desc`: by `getMinPrice(product)`.
- `name-asc`: by `name.localeCompare`.
- `newest`: by `tags.includes("new")` boost + stable id order.

### Pagination

At 44 products: a single page fits comfortably. But we add pagination now so Slice 6 / Fase 3 doesn't refactor later. URL `?page=N`, page size 12 (3×4 on desktop, 2×6 on mobile). RSC builds next/prev links.

## Recommendation

**Approach 1 (pure URL searchParams)** + **substring search** + **URL-driven sort and page**.

- **Page component** (`catalogo/page.tsx`) = Server Component. Reads `searchParams`, calls `queryProducts(parsed)`, renders `<CatalogToolbar />`, `<CatalogFilters />`, `<CatalogGrid />`, `<CatalogPagination />`.
- **`CatalogFilters`** = Client Component. Reads current URL via `useSearchParams`, builds checkbox groups for species / category / brand / tags, calls a helper that sets/unsets params on `router.replace(pathname + "?" + params)` with `scroll: false`. Search input debounced 250 ms. On mobile, lives inside a `Sheet`.
- **`CatalogToolbar`** = Client for the sort `<Select>`, but the result count is a plain prop so it re-renders on server params change.
- **`queryProducts`** in `src/lib/catalog.ts` keeps the data-access port intact: when Fase 3 moves to a real backend, only this function changes — UI stays.

**URL schema** (stable, flat, human-readable):

| Param | Values | Multi? | Notes |
|---|---|---|---|
| `q` | string | — | Search query. |
| `categoria` | slug | Yes (comma-separated) | Accepts top-level or child category slug. |
| `especie` | `dog,cat,bird,small_pet,fish,reptile` | Yes | |
| `marca` | brand slug | Yes | |
| `tag` | `sale,bestseller,new,natural,grain-free,exclusive` | Yes | |
| `precio` | `min-max` | — | CLP; e.g. `0-30000`. |
| `orden` | `relevancia,precio-asc,precio-desc,nombre,nuevos` | — | Default `relevancia`. |
| `page` | `1..N` | — | Default `1`. |

Comma-separated for multi-value (e.g. `especie=dog,cat`) keeps URLs short vs repeated keys.

## Risks

- **Accent normalization**: Spanish products ("Ñuñoa", "peluquería", "Whiskas"). Search must normalize both query and haystack (`.normalize("NFD").replace(/[̀-ͯ]/g, "")`).
- **`searchParams` is async in Next.js 16**: `page.tsx` must `await searchParams` (Promise). Don't forget or TS will catch it.
- **Double navigation on rapid filter toggles**: `router.replace` + debounce is needed for text input. Checkboxes fire immediately — that's fine, UX expects instant feedback.
- **Sheet + sticky filters on mobile**: the `Sheet` primitive from Base UI is already installed; use `SheetTrigger render={<Button />}` pattern (per project convention).
- **Price range input UX**: skip a dual-handle slider for now — use a `Select` with presets ("< $20.000", "$20-50k", etc.) to stay within shadcn primitives. A true slider can come in Slice 6 polish.
- **Stock filter out of scope**: "only in stock" needs to evaluate 44 × (variants × stores) — defer to Slice 5 when stores page exists and the concept of "selected store" has a home.

## Ready for Proposal

Yes. The architectural direction is clear: URL-driven filters, RSC page, data access through `queryProducts` port, substring search with normalization, pagination at 12/page. Next phase (`sdd-propose`) should codify this as a proposal with intent/scope/approach.
