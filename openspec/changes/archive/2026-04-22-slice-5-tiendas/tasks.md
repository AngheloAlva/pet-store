# Tasks: slice-5-tiendas

**Mode**: Strict TDD — every pair is RED (failing test first) → GREEN (minimal impl).

## Phase 1 — Pure helpers (4 tasks)

- [x] 1.1 RED: `src/lib/stores.test.ts` — `getStoreBySlug` returns matching Store; undefined for miss/empty/null.
- [x] 1.2 GREEN: `src/lib/stores.ts` — `getStoreBySlug`.
- [x] 1.3 RED: `src/lib/stores.test.ts` — `DEFAULT_MAP_VIEWPORT` exports `center: [-70.65, -33.45]`, `zoom: 10`; `getStoresCommuneSummary` returns the four communes joined; `STORE_SERVICE_META` has all 4 keys with Spanish labels ("Tienda", "Veterinaria", "Peluquería", "Farmacia") and Phosphor icon references.
- [x] 1.4 GREEN: `src/lib/stores.ts` — add constants and helper; import Phosphor icons.

## Phase 2 — Leaf components (6 tasks)

- [x] 2.1 RED: `src/components/stores/store-service-badge.test.tsx` — renders label for each service; includes an `svg` element for the icon.
- [x] 2.2 GREEN: `src/components/stores/store-service-badge.tsx`.
- [x] 2.3 RED: `src/components/stores/store-popup-card.test.tsx` — name, address, phone as `tel:` link.
- [x] 2.4 GREEN: `src/components/stores/store-popup-card.tsx`.
- [x] 2.5 RED: `src/components/stores/store-card.test.tsx` — full content (name, commune, address, tel link, 3+ badges for Providencia, reference text, 3 schedule rows); omits reference row for Ñuñoa; calls `onSelect(slug)` on click; `aria-current="true"` when selected; Enter/Space triggers select; calls `registerRef` on mount with the button node.
- [x] 2.6 GREEN: `src/components/stores/store-card.tsx`.

## Phase 3 — Store map (mocked WebGL) (4 tasks)

- [x] 3.1 Create shared test helper `src/test/mocks/ui-map.tsx` exporting the mock `Map`/`MapMarker`/`MarkerContent`/`MapPopup`/`MapControls` factories (returned from `vi.mock`).
- [x] 3.2 RED: `src/components/stores/store-map.test.tsx` — with `vi.mock("@/components/ui/map", ...)`: renders 4 markers (one per store) with correct lng/lat data attributes; selected marker has `data-selected="true"`; clicking a marker calls `onSelect(slug)`; `MapPopup` renders only when `selectedSlug` is set at the selected store's coordinates; popup close calls `onSelect(null)`; flyTo is invoked when `selectedSlug` prop changes (via the imperative handle).
- [x] 3.3 GREEN: `src/components/stores/store-map.tsx`.
- [x] 3.4 REFACTOR: extract constants if any duplication shows.

## Phase 4 — Orchestrator (5 tasks)

- [x] 4.1 RED: `src/app/sucursales/store-locator.test.tsx` — with `@/components/ui/map` mocked + `next/navigation` mocked:
  - renders the store list (count = 4)
  - initial selection from `initialSlug="maipu"` prop → Maipú card `aria-current="true"` and `<MapPopup>` rendered
  - clicking a card calls `replaceMock` with `?tienda={slug}`; `scroll: false`
  - clicking a card twice on the same store deselects (or keeps selected — pick behavior: keep selected; deselection only via popup close)
  - clicking the popup close removes the `?tienda` param (replaces with `/sucursales`)
  - marker click triggers `scrollIntoView` on the matching card node (spy on `HTMLElement.prototype.scrollIntoView`)
  - mobile toggle button "Mostrar mapa" exists and has `md:hidden`; clicking flips label to "Ocultar mapa"
- [x] 4.2 GREEN: `src/app/sucursales/store-locator.tsx`.
- [x] 4.3 RED: `src/app/sucursales/store-locator.test.tsx` (external URL change scenario) — simulates `usePathname`/`useSearchParams` returning a different slug after mount; component reconciles local state (opens popup at new slug). Harness updates `searchParamsState.current` and triggers re-render.
- [x] 4.4 GREEN: reconcile effect in `store-locator.tsx`.
- [x] 4.5 REFACTOR: factor out `selectionSourceRef` and URL sync effect comments so intent is clear.

## Phase 5 — RSC page + wiring (3 tasks)

- [x] 5.1 Replace `src/app/sucursales/page.tsx` with RSC shell: async `searchParams`, `getStoreBySlug`, pass `initialSlug` to `<StoreLocator stores={stores} initialSlug={...} />`. Export `metadata` with title "Sucursales" and description from `getStoresCommuneSummary()`.
- [x] 5.2 Manual QA: `pnpm dev`, visit `/sucursales` — verify map renders, markers clickable, cards clickable, URL updates, mobile toggle works (resize), deep link `?tienda=maipu` preselects. Capture in apply-progress.
- [x] 5.3 Quick `pnpm exec tsc --noEmit` to catch server/client boundary leaks.

## Gates

- `pnpm test` all green.
- `pnpm lint` 0 warnings.
- `pnpm exec tsc --noEmit` 0 errors.

## Totals
- 22 discrete tasks across 5 phases.
- ~6 test files.
- ~6 new files, 1 modified file.
