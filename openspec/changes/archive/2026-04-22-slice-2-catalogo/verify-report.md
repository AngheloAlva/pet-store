# Verification Report: slice-2-catalogo

**Mode**: Standard (Strict TDD disabled — no test runner installed per `openspec/config.yaml`)
**Per project `rules.verify`**: gates are `pnpm lint` + `pnpm exec tsc --noEmit`. Test runtime is N/A.

---

## Completeness

| Metric | Value |
|---|---|
| Tasks total | 15 |
| Tasks complete | 15 |
| Tasks incomplete | 0 |

Task 5.3 (manual QA) is marked complete in apply-progress but requires human validation in the browser — flagged below as pending human sign-off, not blocking.

---

## Build & Tests Execution

**Lint** (`pnpm lint`): ✅ **Passed** (exit 0, no output)

**Type check** (`pnpm exec tsc --noEmit`): ✅ **Passed** (exit 0, no output)

**Tests**: ➖ Not available — project has no test runner configured (decision captured at `sdd-init`). The compliance matrix below is therefore built from **static structural evidence**, not runtime assertions.

**Coverage**: ➖ Not available.

---

## Spec Compliance Matrix (static evidence)

| Requirement | Scenario | Evidence | Result |
|---|---|---|---|
| REQ-01 Default Catalog View | First visit with no params | `queryProducts` uses `PAGE_SIZE=12`, default `orden="relevancia"` in `parseCatalogQuery`, toolbar renders `resultCount`, pagination renders `page` of `pageCount` | ✅ COMPLIANT (static) |
| REQ-02 URL Source of Truth | Deep link restores state | `page.tsx` awaits `searchParams`, `parseCatalogQuery` parses all 8 params; client components read via `useSearchParams` | ✅ COMPLIANT (static) |
| REQ-02 URL Source of Truth | Back button restores prior filter | `router.replace` (not push) keeps history navigable; URL is the single source | ✅ COMPLIANT (static) |
| REQ-03 Multi-Value Filters | Cross-group AND, intra-group OR | `queryProducts` composes filters as AND across groups; `.some(s => query.especies.includes(s))` for intra-OR | ✅ COMPLIANT (static) |
| REQ-03 Multi-Value Filters | Category accepts top-level or child slug | `getCategoryWithDescendants()` + `expandedCategorias` set in `queryProducts` | ✅ COMPLIANT (static) |
| REQ-04 Price Range | Preset range filters on min variant price | `queryProducts` gate: `min < q.precio.min || min > q.precio.max` | ✅ COMPLIANT (static) |
| REQ-05 Accent-Insensitive Search | `nunoa` matches "Ñuñoa" | `stripDiacritics` (NFD + strip `\p{Diacritic}`) applied to both `q` and `name+brand+shortDescription` | ✅ COMPLIANT (static) |
| REQ-05 Accent-Insensitive Search | Debounced input 250 ms | `catalog-filters.tsx` `onSearchChange` uses `setTimeout(…,250)` cleared on each keystroke | ✅ COMPLIANT (static) |
| REQ-06 Sort Options | Price ascending | `sortProducts("precio-asc")` sorts by `getMinPrice` ascending | ✅ COMPLIANT (static) |
| REQ-06 Sort Options | Unknown `orden` → fallback | `parseCatalogQuery` validates against `SORT_KEYS` allowlist | ✅ COMPLIANT (static) |
| REQ-07 Pagination | Prev/next preserves other params | `CatalogPagination.hrefFor(query, n)` uses `serializeCatalogQuery({...query, page: n})` | ✅ COMPLIANT (static) |
| REQ-07 Pagination | Out-of-range page behavior | Implementation **CLAMPS** `page` to `pageCount`; spec says render **empty + link home** | ⚠️ DEVIATION (see Issues) |
| REQ-08 Mobile Filter Sheet | Filter inside Sheet keeps it open | Sheet has no programmatic close on URL change; filter writes via `router.replace` only | ✅ COMPLIANT (static, pending human verification) |
| REQ-09 Empty State | Zero results shows message + "Limpiar filtros" | `CatalogGrid` renders shadcn `<Empty>` with `<Button render={<Link href="/catalogo" />}>Limpiar filtros</Button>` | ✅ COMPLIANT (static) |

**Static compliance**: 13/14 scenarios compliant, 1 deviation.

---

## Correctness (Static — Structural Evidence)

| Requirement | Status | Notes |
|---|---|---|
| REQ-01 Default Catalog View | ✅ Implemented | Default orden, PAGE_SIZE, count, pagination wired. |
| REQ-02 URL Source of Truth | ✅ Implemented | RSC reads awaited searchParams; client components read `useSearchParams`. |
| REQ-03 Multi-Value Filters | ✅ Implemented | Comma-separated parse + expansion + AND/OR composition. |
| REQ-04 Price Range | ✅ Implemented | Presets in UI, arbitrary via URL both honored. |
| REQ-05 Accent-Insensitive Search | ✅ Implemented | NFD normalization bilateral. |
| REQ-06 Sort Options | ✅ Implemented | 5 options + fallback. |
| REQ-07 Pagination | ⚠️ Partial | Core pagination correct; out-of-range clamp deviates from spec — see Issues. |
| REQ-08 Mobile Sheet | ✅ Implemented | Same CatalogFilters mounted inside Sheet; URL updates don't close it. |
| REQ-09 Empty State | ✅ Implemented | shadcn Empty + clear-filters CTA. |

---

## Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| URL canonical + RSC page + client island | ✅ Yes | page.tsx is RSC; filters/toolbar are client. |
| Comma-separated multi-value params | ✅ Yes | `listValue` splits on `,`. |
| Substring + NFD normalization | ✅ Yes | `stripDiacritics` used bilaterally. |
| Single CatalogFilters across breakpoints | ✅ Yes | Mounted in desktop `<aside>` and mobile `<Sheet>`. |
| `queryProducts` as single data-access seam | ✅ Yes | Single port; UI never touches `src/data/*`. |
| `router.replace` + `scroll: false` | ✅ Yes | Both `catalog-filters` and `catalog-toolbar` use this pattern. |
| Base UI `render` prop, no `asChild` | ✅ Yes | Grep confirmed zero `asChild` in `src/app`, `src/components/catalog`, `src/components/layout`, `src/components/home`. |

### Unplanned deviations (disclosed by apply)

| Deviation | Impact | Judgment |
|---|---|---|
| Added `src/lib/use-hydrated.ts` helper | +1 file | ACCEPTABLE — reusable React 19 pattern, required to satisfy `react-hooks/set-state-in-effect`. |
| Fixed pre-existing lint errors in `use-mobile.ts` and `carousel.tsx` | 2 files modified (shadcn-generated) | ACCEPTABLE — `use-mobile.ts` rewritten with `useSyncExternalStore` (canonical React 19); `carousel.tsx` got a single-line `eslint-disable` on the embla-carousel initial-sync line with inline justification. |
| Fixed TS error in `featured-categories.tsx` (Icon type import path) | 1 line | ACCEPTABLE — the import was previously broken; this is a latent bug, not a slice-2 regression. |

---

## Issues Found

### CRITICAL

None.

### WARNING

1. **Spec vs code drift — out-of-range page**
   - **Spec** (REQ-07 Pagination): *"Out-of-range values MUST render an empty result with a link back to page 1."*
   - **Code** (`queryProducts` in `src/lib/catalog.ts`): `page = Math.min(Math.max(1, query.page), pageCount)` → clamps out-of-range to the last valid page.
   - **Impact**: `/catalogo?page=99` today silently redirects-via-render to the last page. Users get products, not an empty state.
   - **Decision required**: (a) update spec to say "clamp to last valid page" (code-wins; arguably better UX), OR (b) revert `queryProducts` to return `{ items: [], page: requestedPage, pageCount, total }` and let the grid render empty state (spec-wins; stricter honesty about URL).
   - **Recommendation**: **option (a) — update spec.** Clamping is the more common e-commerce pattern (Amazon, MercadoLibre), prevents confusion from accidentally large `page` values, and requires no code change.

2. **Manual QA not executed by agent**
   - Task 5.3 is marked complete in `apply-progress` but the spec scenarios that require runtime interaction (mobile Sheet behavior, back/forward in a real browser, debounce timing) have NOT been verified by the agent (no test runner, no browser tool in this run).
   - **Decision required**: human must open `pnpm dev`, hit `/catalogo`, probe the 6 scenarios listed in task 5.3 before archiving.

### SUGGESTION

1. **Install Vitest + Testing Library** before Slice 3 (PDP). Slice 3 introduces `generateStaticParams`, variant selection logic, and stock lookup — areas where unit tests meaningfully reduce regression risk. With tests installed, the compliance matrix in future verify reports becomes runtime-backed, not static.
2. **Add `toggleValue` + `parseCatalogQuery` micro-tests** once Vitest is in. These are pure functions with branchy logic — cheap to test, high confidence payoff.
3. **Consider a `formatCatalogCount()` helper** for the pluralization in `catalog-toolbar.tsx` (currently inline ternary). Minor DX improvement, defer.

---

## Verdict

**PASS WITH WARNINGS**

- All 15 tasks complete, lint + tsc green, 13/14 spec scenarios statically compliant.
- 1 acknowledged spec-vs-code drift on out-of-range page behavior — blocks archive until the orchestrator/user picks `spec-wins` or `code-wins` (my recommendation: code-wins, update spec).
- 1 manual-QA gap — requires human browser validation of mobile Sheet, back/forward, and search debounce before archive.
