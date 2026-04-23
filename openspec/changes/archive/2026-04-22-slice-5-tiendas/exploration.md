## Exploration: slice-5-tiendas (Store locator)

### Current State

- **Route**: `/sucursales/page.tsx` is a placeholder RSC (`<Container><h1>Sucursales</h1>…Slice 5.</p>`). The nav in `src/lib/site.ts` points to `/sucursales` — **internal SDD naming says "tiendas", but the actual route is `/sucursales`** (user-facing word). No split.
- **Data**: `src/data/stores.ts` has 4 seed stores, each with `coordinates: { lat, lng }`, `address`, `commune`, `phone`, `schedule: { weekdays, saturday, sunday }`, `services: Array<"shop" | "vet" | "grooming" | "pharmacy">`, optional `reference`.
- **Type**: `src/types/store.ts` defines `Store`, `Coordinates`, `StoreSchedule`, `StoreService`. No derived getters exist (unlike products/catalog).
- **Map primitive**: `src/components/ui/map.tsx` (full Base UI-style API). Relevant exports: `Map`, `MapMarker`, `MarkerContent`, `MarkerPopup`, `MarkerTooltip`, `MarkerLabel`, `MapPopup`, `MapControls`. Key properties:
  - `Map` accepts controlled viewport: `viewport?: Partial<MapViewport>` + `onViewportChange`. Uncontrolled also supported.
  - Uses MapLibre GL JS + Carto basemaps (positron/dark-matter). Theme autodetect via `document.documentElement` classes (works with next-themes if ever added).
  - Internal guards: `getDocumentTheme` checks `typeof document === "undefined"` — **safe on server**. The `Map` component itself uses `useRef`/`useEffect`, so it hydrates cleanly.
  - Children only render after `mapInstance` exists; tight WebGL contract means the underlying canvas is client-only.
- **No existing store-locator tests**. No `src/lib/stores.ts` helpers.
- **Header nav** already wires `/sucursales`. Cart drawer does not need a link to it (not required this slice).

### Affected Areas

- `src/app/sucursales/page.tsx` — Modified (replace placeholder with real shell).
- `src/app/sucursales/store-locator.tsx` — New client orchestrator (map + list).
- `src/components/stores/` — New dir.
  - `store-map.tsx` — Wraps `<Map>` with stores-as-markers + controlled viewport.
  - `store-card.tsx` — List item with name, address, phone, schedule, services, "Ver en mapa" CTA.
  - `store-service-badge.tsx` — Icon + label chip per service.
  - `store-popup-card.tsx` — Compact card rendered inside `MarkerPopup` (reusable for tooltips).
- `src/lib/stores.ts` — New pure helpers: `getStoreBySlug`, `DEFAULT_MAP_VIEWPORT` (center/zoom over Santiago), `computeBoundsFromStores` (fit-to-markers).
- `src/types/store.ts` — No change (types already sufficient).
- `src/data/stores.ts` — No change.
- `src/components/layout/site-header.tsx` / `src/lib/site.ts` — No change (already points to `/sucursales`).

### Approaches

1. **Single client island (Map + List co-rendered)** — One client component mounts both the map and the list, owns the selected store state locally.
   - Pros: simplest wiring; no prop drilling or context; map and list share the same render tree; easy bidirectional sync; no URL state to reconcile with map animations.
   - Cons: harder to deep-link a specific store; no shareable URL for "open with Maipú selected"; the whole page is client.
   - Effort: Low.

2. **URL-driven (`?tienda={slug}`) + RSC page + client island** — Page reads `searchParams` (Next 16 async), passes initial selection to client, client updates URL via `router.replace` on selection change.
   - Pros: shareable links ("envié al Mall Plaza Oeste a un cliente"); back/forward respects selection; graceful degrade if JS off (URL still valid); consistent with Slice 2 (URL-as-source-of-truth for catalog).
   - Cons: more moving parts; need to debounce URL writes during map pans to avoid history spam; need to distinguish "user clicked" from "map fly-to completed" to not feedback-loop.
   - Effort: Medium.

3. **Zustand slice for selected store** — Global store for selection.
   - Pros: reusable from anywhere (e.g., "view store" button in product stock list later).
   - Cons: overkill for one page; no persistence value (selection is ephemeral, not like cart); violates "no global state unless it spans surfaces" from Slice 4 lessons.
   - Effort: Medium.

### Recommendation

**Approach 2 — URL-driven (`?tienda={slug}`) + RSC shell + client island.** Consistency with Slice 2 is the deciding factor: the catalog uses URL as single source of truth, the cart drawer uses Zustand because it's cross-surface, and the store locator is page-local with sharing value, so URL wins. Specific decisions:

- **Route**: `/sucursales`. Change name `slice-5-tiendas` is SDD-internal; the user-facing word stays "Sucursales" (already in nav).
- **RSC page**: `src/app/sucursales/page.tsx` reads `await searchParams` (Next 16), validates `?tienda={slug}` against `getStoreBySlug`, passes initial `selectedSlug` to `<StoreLocator />`.
- **Client island**: `<StoreLocator initialSlug={selectedSlug} />` owns the selection via `useState`, syncs URL with `router.replace(pathname + "?" + params, { scroll: false })` on user-driven changes. Internal `useRef<flag>` guards to avoid URL updates during programmatic fly-to.
- **Bidirectional sync**:
  - Click marker → `setSelected(slug)` → list scrolls the card into view (`useEffect` + `scrollIntoView({ block: "nearest", behavior: "smooth" })`). Card gets `data-selected="true"` and an `aria-current="true"` ring.
  - Click card → `setSelected(slug)` + imperatively `mapRef.current?.flyTo({ center: [lng, lat], zoom: 14, duration: 800 })` + set `popupOpen` state on that marker.
- **Controlled viewport vs imperative**: use the primitive in UNCONTROLLED mode and grab the imperative `mapRef` (it's a `forwardRef` exposing the MapLibre instance). Simpler than threading viewport state; avoids feedback loops between "user pans map" and "card is clicked".
- **Mobile collapse**: simple toggle — CSS-driven. Default on `md+`: `grid-cols-[minmax(22rem,28rem)_1fr]` (list left, map right). On `< md`: list renders stacked; a button `Mostrar mapa` toggles a sticky container with the map. State via `useState`. No Collapsible library needed.
- **Default viewport**: center over Santiago `[-70.65, -33.45]`, zoom 10. Fit-to-markers button in `MapControls` `showLocate` is off (not ideal for Chilean demo — users see their own house, not our stores). Instead add a small "Recenter" button.
- **Markers**: `<MarkerContent>` rendering a PawPrint icon inside a brand-colored circle; on selected state, grow to 1.15× and add a ring. `<MarkerPopup closeButton={true}>` with `<StorePopupCard>` (name, address, phone, "Ver detalles" scrolls card into view).
- **Services**: 4 icons via Phosphor — `Storefront` (shop), `FirstAid` or `Syringe` (vet), `Scissors` (grooming), `Pill` (pharmacy). Chip = icon + Spanish label. A `STORE_SERVICE_META` map keeps translation + icon.
- **Hydration**: the primitive handles it; page wraps `<StoreLocator/>` in a server component that passes initial data + URL slug. Render a static placeholder height to avoid CLS (`<div className="h-[60svh]" />` while WebGL inits — the primitive already shows its own loader).
- **A11y**:
  - Markers: `MarkerContent` gets `role="button" aria-label={store.name} tabIndex={0}`. The primitive's default marker element is a `div`; we override via children so this is additive.
  - Popup close button already built-in when `closeButton={true}` (primitive wires `X` button with `aria-label="Close popup"`).
  - Cards: `<button>` or `<article role="button" tabIndex={0}>`. Keyboard Enter/Space activates select.
  - Map canvas focus: Map component's canvas is keyboard-focusable and supports arrow keys (MapLibre default).
- **Metadata**: `title: "Sucursales"`, description `"Encuentra tu SimplePet en Providencia, Las Condes, Ñuñoa y Maipú."` (computed from `stores.map(s => s.commune).join(", ")`).
- **Testing with WebGL absence in jsdom**: the primitive will try to construct a MapLibre `Map`, which requires WebGL — jsdom doesn't provide it. Three strategies:
  1. Mock `@/components/ui/map` module at the test layer so `Map`, `MapMarker`, etc. render plain divs. Tests for the orchestrator assert props passed + callbacks.
  2. Keep ALL map-touching logic in a thin "presenter" client component and test the non-map surfaces (list, cards, badges) at the unit level; leave the map integration as visual/manual QA.
  3. Vitest `pool: "forks"` + `canvas` polyfill — heavy, flaky.
  **Decision**: strategy 1 (module mock) for the orchestrator test + strategy 2 (isolated component tests) for `StoreCard`, `StoreServiceBadge`, `StorePopupCard`, and helpers. The visual map behavior is validated manually.

### Risks

- **WebGL in tests**: confirmed primitive constructs `new MapLibreGL.Map` unconditionally on mount. Any component test that renders `<Map>` without mocking will throw. **Mitigation**: `vi.mock("@/components/ui/map", ...)` at the orchestrator test file; isolate map-free components elsewhere.
- **Theme sync + next-themes not installed**: primitive detects `.dark` on `<html>`. Current project uses `next-themes` dependency (in `package.json`) but no `<ThemeProvider>` mounted — so `.dark` never appears. Light-only will render fine; stay on the default light basemap. **Mitigation**: pass `theme="light"` explicitly to skip detection and avoid flicker.
- **URL feedback loop**: clicking a card → fly-to → pan event → could trigger URL update if we listen to `onViewportChange`. **Mitigation**: DO NOT sync URL on viewport change; only sync on explicit card/marker click. Internal guard flag to suppress.
- **Viewport jump on back/forward**: `popstate` with a different `?tienda=` should update selection + fly-to. We read selection on mount; `usePathname`/`useSearchParams` re-render handles subsequent navigations.
- **Marker click vs map drag**: MapLibre distinguishes this natively; `MapMarker` `onClick` fires only on click, not drag. No action.
- **Popup and controlled open**: the primitive's `MarkerPopup` opens via user click on the marker by default (maplibre built-in). To open programmatically from a card click, we'd need to call `marker.togglePopup()` — the primitive does NOT expose the marker ref. **Mitigation**: use `<MapPopup>` (top-level popup with longitude/latitude) controlled by our selection state instead of marker-bound popups. Open a `<MapPopup>` for the selected store; close on deselect/X.
- **Dense markers at low zoom**: 4 stores in Santiago is fine even at city zoom; no clustering needed. `MapClusterLayer` is available if we ever expand to nationwide. Out of scope.
- **Popup close button handler**: primitive's built-in close button calls `popup.remove()` which does NOT call back to our state. `<MapPopup>` exposes `onClose`. Use that to sync our `selected = null` state.

### Ready for Proposal

**Yes.** Clear path. No open questions. Proposal will:
- Introduce `store-locator` capability (NEW).
- Scope: `/sucursales` page with map+list, bidirectional selection, URL param, mobile collapsible map, services badges, store popup.
- Out of scope: stock per store, user geolocation, driving directions, nationwide expansion, dark theme toggle (app-wide concern).
