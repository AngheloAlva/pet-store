# Tasks: Slice 2 — Product Catalog

## Phase 1: Foundation (url-params + data port)

- [x] 1.1 Create `src/lib/url-params.ts` — export `SortKey`, `CatalogQuery`, `stripDiacritics(s)`, `parseCatalogQuery(searchParams)`, `serializeCatalogQuery(query)`. Unknown `orden` → `"relevancia"`. Clamp `page ≥ 1`. `precio` parses `"min-max"` (ints, inclusive).
- [x] 1.2 Extend `src/lib/catalog.ts` — add `PAGE_SIZE = 12`, `SORT_OPTIONS`, `PRICE_PRESETS`, `getAllBrands()`, `getCategoryTree()` (top-level with children), `getCategoryWithDescendants(slug)` (returns slug[] including self), `getSpeciesInUse()`, `getPriceRange()` (min/max across all variants).
- [x] 1.3 Implement `queryProducts(q: CatalogQuery)` in `src/lib/catalog.ts`: filter → sort → paginate → return `{ items, total, page, pageCount }`. Filter order: q (name + brand via `stripDiacritics`), especies (OR), categorias (expand to descendants, OR), marcas (OR), tags (OR), precio (`min(variant.price) ∈ range`). Sort per `SortKey`. Slice `(page-1)*PAGE_SIZE..page*PAGE_SIZE`.

## Phase 2: Components (bottom-up)

- [x] 2.1 Create `src/components/catalog/catalog-grid.tsx` (RSC) — receives `products: Product[]`; renders grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` of `<ProductCard />`. If empty, render empty state with "Limpiar filtros" `<Link href="/catalogo">`.
- [x] 2.2 Create `src/components/catalog/catalog-pagination.tsx` (RSC) — props `{ page, pageCount, searchParams }`. Build prev/next/numbered `<Link>` preserving other params via `serializeCatalogQuery`. Hide entirely if `pageCount ≤ 1`.
- [x] 2.3 Create `src/components/catalog/catalog-toolbar.tsx` (client) — `"use client"`; receives `{ resultCount, query }`. Renders: result count text, sort `<Select>` (writes `orden` via `router.replace`), mobile "Filtrar" `SheetTrigger render={<Button variant="outline" />}` wrapping the Sheet with `<CatalogFilters />` inside.
- [x] 2.4 Create `src/components/catalog/catalog-filters.tsx` (client) — `"use client"`; receives `{ brands, categoryTree, speciesInUse }`. Reads URL via `useSearchParams`, writes via `router.replace(pathname + "?" + params, { scroll: false })`. Groups: search input (`Input`, debounced 250 ms via `useEffect` + `setTimeout`), categoria (`Checkbox` per top-level + children, hierarchical), especie (`Checkbox`), marca (`Checkbox`), tag (`Checkbox`), precio (`Select` presets). Toggle helpers add/remove a value from a comma-separated param.

## Phase 3: Page wiring

- [x] 3.1 Rewrite `src/app/catalogo/page.tsx` — RSC; `Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }`. Await `searchParams`, parse with `parseCatalogQuery`, call `queryProducts`, render layout: `<Container>` with `grid md:grid-cols-[260px_1fr] gap-8`: left = desktop `<aside className="hidden md:block">` with `<CatalogFilters />`, right = `<CatalogToolbar />` + `<CatalogGrid />` + `<CatalogPagination />`.
- [x] 3.2 Update `metadata` for `/catalogo` — `title: "Catálogo"`, dynamic description if single filter active (e.g. "Productos para perros"). Use `Metadata` typed object (static for now).

## Phase 4: Polish

- [x] 4.1 Accessibility — each filter group has a visible `<h3>` label; `<Checkbox>` gets an `id` bound to `<Label htmlFor>`; search `Input` has `aria-label="Buscar productos"`; pagination `<Link>` gets `aria-label="Página anterior/siguiente"` and `aria-current="page"` on active.
- [x] 4.2 Empty state — inside `catalog-grid.tsx` use shadcn `<Empty>` primitive if present, otherwise inline card with title "Sin resultados", subtitle "Probá quitar algún filtro.", and the "Limpiar filtros" link.
- [x] 4.3 Verify Base UI composition — no `asChild` anywhere; any Button-as-Link uses `render={<Link />}`; any SheetTrigger-as-Button uses `render={<Button />}`.

## Phase 5: Verification

- [x] 5.1 Run `pnpm lint` — fix any issues.
- [x] 5.2 Run `pnpm exec tsc --noEmit` — fix any issues.
- [x] 5.3 Manual QA against spec scenarios: default view (12 items, count, page 1), deep link `/catalogo?categoria=perros&marca=royal-canin&orden=precio-asc&page=2`, back button restores state, `q=nunoa` matches "Ñuñoa", out-of-range `page=99` shows empty + link, mobile Sheet stays open on filter toggle.
