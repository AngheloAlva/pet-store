# Proposal: Slice 2 — Product Catalog

## Intent

The home page (Slice 1) funnels users to `/catalogo` but the route is a stub. Without a working catalog the demo cannot simulate the core e-commerce journey (browse → filter → find → click into PDP). This slice delivers the catalog as the central navigation hub, using URL-driven state so filter combinations are shareable, back/forward works natively, and the server can render the grid with SEO-friendly URLs for every filter combo.

## Scope

### In Scope

- `/catalogo` as an RSC page that reads `searchParams` and renders a filtered, sorted, paginated grid.
- Filter UI (client island): multi-value checkboxes for `categoria`, `especie`, `marca`, `tag`; `Select` presets for `precio`; debounced text input for `q`.
- Mobile filters inside a `Sheet` via Base UI `render` prop.
- Sort `Select` with 5 options (`relevancia`, `precio-asc`, `precio-desc`, `nombre`, `nuevos`).
- Pagination at 12/page with server-built prev/next links.
- `queryProducts({ filters, sort, page })` port in `src/lib/catalog.ts` — single seam for future backend swap.
- Accent-insensitive search (`NFD` normalization).

### Out of Scope

- Stock-based filter ("only in stock") — deferred to Slice 5 once the stores page exists.
- Dual-handle price slider — uses `Select` presets this slice.
- Fuzzy search (Fuse.js / MiniSearch) — unnecessary at 44 products.
- Saving filter preferences to localStorage — URL is the state.
- Infinite scroll — stays with numbered pagination.

## Capabilities

### New Capabilities
- `product-catalog`: browse, filter, search, sort, and paginate the product listing via URL-driven state; covers the data-access port (`queryProducts`) and the full `/catalogo` UI.

### Modified Capabilities
- None.

## Approach

Server Component at `src/app/catalogo/page.tsx` awaits `searchParams`, parses them via a new `src/lib/url-params.ts` helper into a typed `CatalogQuery`, calls `queryProducts(query)` from `src/lib/catalog.ts`, and passes results to `<CatalogToolbar />`, `<CatalogFilters />`, `<CatalogGrid />`, `<CatalogPagination />`. Only filters and sort are client components — they write to the URL with `router.replace(pathname + "?" + params, { scroll: false })` on change. Checkbox toggles fire immediately; text search is debounced 250 ms.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/catalogo/page.tsx` | Modified | Stub → real RSC page. |
| `src/lib/catalog.ts` | Modified | Add `queryProducts`, `getAllBrands`, `getCategoryTree`, `getPriceRange`, `getSpeciesInUse`. |
| `src/lib/url-params.ts` | New | Parse/serialize `CatalogQuery`. |
| `src/components/catalog/*.tsx` | New | `catalog-filters`, `catalog-toolbar`, `catalog-grid`, `catalog-pagination`. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `searchParams` async in Next 16 missed | Med | Typed `CatalogQuery` + `await searchParams` enforced by `url-params.ts`. |
| Accent mismatches on search | Med | Normalize both query and haystack with `NFD` + combining-marks strip. |
| Rapid filter toggles spam navigation | Low | `router.replace` (not push) + immediate toggles are idempotent. |
| Base UI composition misuse | Low | Project rule: `render={<Element />}`; tasks will call it out. |

## Rollback Plan

`/catalogo/page.tsx` is self-contained. Revert the Slice 2 commit: the stub from Slice 0 returns, home links keep working (they point to the same route), no data migrations involved. New files (`src/components/catalog/*`, `src/lib/url-params.ts`) are additive and can be deleted without side effects.

## Dependencies

- None. All data is already in `src/data/*` and `ProductCard` already works.

## Success Criteria

- [ ] `/catalogo` renders 44 products across pages of 12, default sort `relevancia`.
- [ ] Deep link `/?categoria=perros&marca=royal-canin&orden=precio-asc&page=2` renders correctly server-side.
- [ ] Search `"royal canin"` finds `royal-canin-*` products; `"ñuñoa"` and `"nunoa"` both work.
- [ ] Mobile: filter Sheet opens, filters apply, URL updates, Sheet stays open.
- [ ] Browser back/forward restores previous filter state.
- [ ] `pnpm lint` and `pnpm exec tsc --noEmit` pass.
