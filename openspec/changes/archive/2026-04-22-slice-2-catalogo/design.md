# Design: Slice 2 — Product Catalog

## Technical Approach

Server Component page awaits `searchParams`, parses them into a typed `CatalogQuery`, calls `queryProducts(query)` from the data-access port, and renders four children: toolbar (sort + count), filters (desktop sidebar / mobile Sheet), grid, pagination. Only filters and sort are client components — they write the URL via `router.replace`. Data-access stays behind a single function so Fase 3's backend swap is one-file work.

## Architecture Decisions

### Decision: URL as canonical state, RSC page, client filter island

| Option | Tradeoff | Decision |
|---|---|---|
| Pure URL + RSC page + client filter island | Shareable, SSR, small JS island | ✅ Chosen |
| Client-only state | Smaller server work but no deep-link, no SSR, bigger bundle | Rejected |
| Hybrid optimistic + URL | Snappier but complex; no UX gain at 44 items | Rejected |

### Decision: Comma-separated multi-value params

| Option | Tradeoff | Decision |
|---|---|---|
| `?especie=dog,cat` | Short URLs, one `URLSearchParams.get()` | ✅ Chosen |
| `?especie=dog&especie=cat` | Native `getAll()`, but longer URLs, harder to diff | Rejected |

### Decision: Substring + NFD normalization for search

| Option | Tradeoff | Decision |
|---|---|---|
| `.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,"")` | Zero-dep, instant on 44 items, predictable | ✅ Chosen |
| Fuse.js / MiniSearch | Fuzzy typo tolerance, but 10–40 KB dep for 44 items | Rejected |

### Decision: Same filter component for desktop sidebar and mobile Sheet

Single `<CatalogFilters />` renders the groups. `/catalogo/page.tsx` mounts it twice: once inside a desktop-only `<aside>` (CSS `hidden md:block`), once inside a `<Sheet>` trigger that's `md:hidden`. Both instances read the same URL via `useSearchParams` — no shared client state needed. This avoids divergent UIs for desktop vs mobile and keeps the component pure.

### Decision: `queryProducts` as the only data-access seam

Every helper in `catalog.ts` other than `queryProducts` is a read-through convenience for filter UI building (`getAllBrands`, `getCategoryTree`, etc.). When Fase 3 adds a database, these helpers move behind the same synchronous interface for SC consumption, or upgrade to async together. UI never reaches into `src/data/*` directly.

## Data Flow

```
URL (?categoria=perros&q=royal)
  │
  ▼
src/app/catalogo/page.tsx  ── await searchParams ──┐
  │                                                │
  ▼                                                │
src/lib/url-params.ts ── parseCatalogQuery ────────┤
  │                                                │
  ▼                                                │
src/lib/catalog.ts ── queryProducts(query) ────────┤
  │                                                │
  ├─→ CatalogToolbar ──→ sort Select (client) ─────┤
  ├─→ CatalogFilters (client) ─ router.replace ────┘  ← writes back to URL
  ├─→ CatalogGrid ──→ ProductCard[]
  └─→ CatalogPagination ──→ <Link> next/prev
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/app/catalogo/page.tsx` | Modify | RSC, awaits searchParams, orchestrates children. |
| `src/lib/url-params.ts` | Create | `CatalogQuery` type, `parseCatalogQuery`, `serializeCatalogQuery`, `stripDiacritics`. |
| `src/lib/catalog.ts` | Modify | Add `queryProducts`, `getAllBrands`, `getCategoryTree`, `getCategoryWithDescendants`, `getPriceRange`, `getSpeciesInUse`, `PRICE_PRESETS`, `SORT_OPTIONS`, `PAGE_SIZE`. |
| `src/components/catalog/catalog-filters.tsx` | Create | Client island; multi-value checkbox groups, price Select, search input with 250 ms debounce; writes URL via `router.replace`. |
| `src/components/catalog/catalog-toolbar.tsx` | Create | Client; sort `Select` + mobile "Filtrar" `SheetTrigger` (`render={<Button />}`); receives `resultCount` prop. |
| `src/components/catalog/catalog-grid.tsx` | Create | RSC; maps products → `<ProductCard />`; empty state with `Limpiar filtros` link. |
| `src/components/catalog/catalog-pagination.tsx` | Create | RSC; builds prev/next/page-number `<Link>` preserving other params. |

## Interfaces / Contracts

```ts
// src/lib/url-params.ts
export type SortKey = "relevancia" | "precio-asc" | "precio-desc" | "nombre" | "nuevos";

export type CatalogQuery = {
  q: string;              // normalized (empty string if absent)
  categorias: string[];   // slugs
  especies: Species[];
  marcas: string[];       // brand slugs
  tags: ProductTag[];
  precio: { min: number; max: number } | null;
  orden: SortKey;
  page: number;           // 1-based, clamped ≥ 1
};

export function parseCatalogQuery(
  sp: Record<string, string | string[] | undefined>
): CatalogQuery;

export function serializeCatalogQuery(q: Partial<CatalogQuery>): URLSearchParams;

export function stripDiacritics(s: string): string;

// src/lib/catalog.ts
export const PAGE_SIZE = 12;
export const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }>;
export const PRICE_PRESETS: ReadonlyArray<{ value: string; label: string; range: [number, number] }>;

export function queryProducts(q: CatalogQuery): {
  items: Product[];
  total: number;
  page: number;
  pageCount: number;
};
```

## Non-Obvious Patterns

- **Filter island writes URL**: uses `router.replace(pathname + "?" + serializeCatalogQuery(next), { scroll: false })` — `replace` (not `push`) so filter toggling doesn't flood history; `scroll: false` so the viewport stays on the grid.
- **Debounced text**: `useEffect` with `setTimeout(250)` cancelled on each keystroke. Checkboxes fire immediately (idempotent).
- **Base UI**: `<SheetTrigger render={<Button>Filtrar</Button>} />`. No `asChild` anywhere (project rule).

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `parseCatalogQuery`, `serializeCatalogQuery`, `stripDiacritics`, `queryProducts` | None available — verified via manual URL probes listed in spec scenarios. |
| Integration | Page SSR with deep-link URLs | Manual; verify `/catalogo?...` renders correctly. |
| E2E | Filter/search/sort flow | Deferred (no test runner). Spec scenarios guide manual QA. |

Note: `pnpm lint` + `pnpm exec tsc --noEmit` are the automated gates for this slice.

## Migration / Rollout

No migration. Purely additive UI. Stub at `src/app/catalogo/page.tsx` is replaced atomically.

## Open Questions

- [ ] Should `categoria=perros` also auto-check the species `dog` in the filter UI? Decision: **no** — they're independent filter groups; users may want "perros pero especie gato" (accessories tagged with dog category but species cat). Keep them orthogonal.
