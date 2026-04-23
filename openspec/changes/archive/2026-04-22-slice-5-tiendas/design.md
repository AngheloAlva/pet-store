# Design: slice-5-tiendas

## Decisions

### 1. URL as the source of truth for selection

`?tienda={slug}` is canonical. The RSC page reads `await searchParams`, passes `initialSlug` to the client island, and the client calls `router.replace(...)` whenever selection changes via user input. Rejected: pure local state (breaks sharing), Zustand (overkill for page-local state).

### 2. Map in uncontrolled mode + imperative `forwardRef`

`<Map>` is the primitive; we grab the MapLibre instance via `ref` and call `mapRef.current?.flyTo(...)` imperatively. Controlled viewport was evaluated and rejected — it forces every pan/zoom to re-enter React, which couples selection to animation and creates feedback loops with URL sync.

```tsx
const mapRef = useRef<MapRef>(null);
// ...
<Map ref={mapRef} theme="light" /* no viewport prop */ {...initialViewport}>
```

`MapProps` accepts `...Omit<MapLibreGL.MapOptions, "container" | "style">` so `center` and `zoom` are passed directly (lower-case MapLibre options, not the `viewport` prop) for initial positioning.

### 3. Controlled `<MapPopup>` for selection, not `<MarkerPopup>`

The primitive's `<MarkerPopup>` opens on marker click via MapLibre's built-in handler, but there is NO imperative handle to toggle it from our code. Clicking a card therefore cannot open a `MarkerPopup`. Instead we render a top-level `<MapPopup longitude={...} latitude={...} onClose={...} closeButton>` conditional on `selectedSlug`. Its lifecycle = the selection lifecycle, which gives us:

- Click marker → `setSelected(slug)` → `<MapPopup>` mounts at that store.
- Click card → `setSelected(slug)` → `<MapPopup>` mounts + `mapRef.flyTo(...)`.
- Click popup close button → `onClose` → `setSelected(null)`.

### 4. Selection state live in `<StoreLocator>`, not in each child

`<StoreLocator>` owns `selectedSlug: string | null` and a `listRef: Map<string, HTMLElement>` so marker clicks can scroll cards into view. Everything below receives `selectedSlug` + `onSelect` callback. Children are dumb.

### 5. URL sync uses `router.replace`, not `push`

Selection should NOT pollute history stacks. Back/forward from other pages still works; within the locator, the URL reflects the latest selection. When `selectedSlug === null`, the param is removed.

```tsx
const pathname = usePathname();
const router = useRouter();
useEffect(() => {
  if (skipUrlSyncRef.current) { skipUrlSyncRef.current = false; return; }
  const params = new URLSearchParams();
  if (selectedSlug) params.set("tienda", selectedSlug);
  const qs = params.toString();
  router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
}, [selectedSlug, pathname, router]);
```

`skipUrlSyncRef` suppresses the initial run (the URL already matches on mount because we initialized from it).

### 6. Back/forward via `useSearchParams`

`const currentSlug = useSearchParams().get("tienda")`. A secondary effect reconciles local state when the URL changes from outside (browser back). If `currentSlug !== selectedSlug`, we update local state and fly to the new store. This closes the Back scenario from Requirement 6.

### 7. Pure helpers in `src/lib/stores.ts`

```ts
export const DEFAULT_MAP_VIEWPORT = {
  center: [-70.65, -33.45] as [number, number],
  zoom: 10,
};

export function getStoreBySlug(slug: string | undefined | null): Store | undefined {
  if (!slug) return undefined;
  return stores.find((s) => s.slug === slug);
}

export function getStoresCommuneSummary(): string {
  return stores.map((s) => s.commune).join(", ");
}

export const STORE_SERVICE_META: Record<StoreService, { label: string; Icon: PhosphorIcon }> = {
  shop:     { label: "Tienda",      Icon: Storefront },
  vet:      { label: "Veterinaria", Icon: FirstAid },
  grooming: { label: "Peluquería",  Icon: Scissors },
  pharmacy: { label: "Farmacia",    Icon: Pill },
};
```

Trivial, testable, no surprises.

### 8. Component structure

```
src/components/stores/
├── store-map.tsx           # "use client"; wraps <Map/> + markers + popup
├── store-card.tsx          # "use client"; list item, acts as <button>
├── store-service-badge.tsx # "use client" (Phosphor client icons); small chip
├── store-popup-card.tsx    # "use client"; compact card for <MapPopup>
```

`<StoreMap>` API:

```tsx
type Props = {
  stores: Store[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
};
```

It renders the `<Map>` primitive with initial `center={DEFAULT_MAP_VIEWPORT.center}` + `zoom={DEFAULT_MAP_VIEWPORT.zoom}`, `theme="light"`, then a `<MapMarker>` per store with a `<MarkerContent>` containing a circular div + `PawPrint` icon. When `selectedSlug` matches, the marker div gets `data-selected="true"` + a scale/ring class. A controlled `<MapPopup>` renders if a store is selected.

`<StoreCard>` API:

```tsx
type Props = {
  store: Store;
  isSelected: boolean;
  onSelect: (slug: string) => void;
  registerRef?: (node: HTMLElement | null) => void;
};
```

Renders as a `<button type="button">` to get keyboard-for-free; internally structured with name, commune, address, `tel:` link, service badges, optional reference, and a schedule table.

### 9. Marker UI (concrete)

```tsx
<MarkerContent
  className={cn(
    "grid place-items-center h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-md transition-transform",
    isSelected && "scale-110 ring-2 ring-primary/60 ring-offset-2 ring-offset-background",
  )}
  role="button"
  aria-label={store.name}
  tabIndex={0}
  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(store.slug); }}
>
  <PawPrint weight="fill" size={16} />
</MarkerContent>
```

Note: `MarkerContent` already renders inside the marker element; we pass the circle + icon as children. Keyboard focus works because we set `tabIndex`. Primitive wires click already.

### 10. Mobile toggle

```tsx
const [showMap, setShowMap] = useState(false);
// ...
<Button variant="outline" className="md:hidden mb-4" onClick={() => setShowMap(v => !v)}>
  {showMap ? "Ocultar mapa" : "Mostrar mapa"}
</Button>
<div className={cn("grid gap-6", "md:grid-cols-[minmax(22rem,28rem)_1fr]")}>
  <div>{/* list */}</div>
  <div className={cn("h-[60svh] md:h-[calc(100vh-8rem)] md:sticky md:top-20", !showMap && "hidden md:block")}>
    {/* map only rendered when visible */}
    {(showMap || isMdUp) && <StoreMap ... />}
  </div>
</div>
```

We don't need a `useMediaQuery` hook — Tailwind `md:hidden`/`md:block` handle visibility, and we unconditionally render the map on `md+`. On mobile, gate rendering on `showMap` to avoid instantiating MapLibre when the user never opens it.

Implementation note: use `useHydrated()` to avoid rendering the map on server (it's client-only anyway, but this guards against hydration mismatch in layout classes).

### 11. Scroll-into-view for marker → card

`<StoreLocator>` keeps `cardRefs = useRef<Map<string, HTMLElement>>(new Map())`. Each `<StoreCard>` registers: `registerRef={(node) => { if (node) cardRefs.current.set(store.slug, node); else cardRefs.current.delete(store.slug); }}`.

On `selectedSlug` change (when the source is a marker click, distinguished via a `selectionSourceRef` flag), scroll:

```ts
useEffect(() => {
  if (!selectedSlug || selectionSourceRef.current !== "marker") return;
  const node = cardRefs.current.get(selectedSlug);
  node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}, [selectedSlug]);
```

### 12. Tests (Strict TDD)

WebGL is the elephant. We apply a surgical mock only in files that render `<StoreMap>` or the orchestrator; everything else stays un-mocked.

Test pairs:
1. `src/lib/stores.test.ts` — `getStoreBySlug` (hit/miss/undefined/null), `getStoresCommuneSummary` (joined string), `DEFAULT_MAP_VIEWPORT` (exports the expected constants), `STORE_SERVICE_META` (all four keys present, Spanish labels).
2. `src/components/stores/store-service-badge.test.tsx` — renders icon + label for each service.
3. `src/components/stores/store-popup-card.test.tsx` — renders name/address/phone tel link.
4. `src/components/stores/store-card.test.tsx` — renders all the content (Req 3), omits reference when absent, calls `onSelect` on click and on Enter, `aria-current` when selected, badges render, schedule rows rendered.
5. `src/components/stores/store-map.test.tsx` — mocks `@/components/ui/map` to render stub `<div data-slot="map" />` + `<button data-slot="marker" data-slug={slug}>` + exposing `mapRef`. Verifies markers rendered per store, selected marker has `data-selected`, clicking a marker calls `onSelect`, `<MapPopup>` rendered when selected, popup `onClose` fires `onSelect(null)`.
6. `src/app/sucursales/store-locator.test.tsx` — mocks `@/components/ui/map`, validates selection flow, URL sync (using `vi.mock("next/navigation", ...)` to stub `useRouter`, `usePathname`, `useSearchParams`), initial slug from prop, mobile toggle button renders with `md:hidden` class, card click → setSelected called, marker click → scrollIntoView called on registered card ref.

### 13. Test harness for `next/navigation`

```ts
const replaceMock = vi.fn();
const searchParamsState = { current: new URLSearchParams() };
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/sucursales",
  useSearchParams: () => searchParamsState.current,
}));
```

Tests set `searchParamsState.current = new URLSearchParams("tienda=maipu")` before render to exercise deep link.

### 14. Primitive mock for `@/components/ui/map`

```ts
vi.mock("@/components/ui/map", () => {
  const React = require("react");
  return {
    Map: React.forwardRef(({ children }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ flyTo: vi.fn() }));
      return <div data-slot="map">{children}</div>;
    }),
    MapMarker: ({ children, onClick, longitude, latitude }: any) => (
      <div data-slot="marker" data-lng={longitude} data-lat={latitude} onClick={onClick}>{children}</div>
    ),
    MarkerContent: ({ children, ...rest }: any) => <div data-slot="marker-content" {...rest}>{children}</div>,
    MapPopup: ({ children, onClose }: any) => (
      <div data-slot="map-popup">
        {children}
        <button data-slot="popup-close" onClick={onClose}>close</button>
      </div>
    ),
    MapControls: () => null,
  };
});
```

Placed in a dedicated `src/test/map-mock.ts` (exported helper) or inlined per-test — start inline, factor out if duplication appears.

### 15. Out-of-scope guardrails

- No `useMediaQuery` — Tailwind handles it.
- No dependency on `next-themes` runtime (only the package's types). Theme forced to `"light"` via prop.
- No `geolocation` API calls (risk of permission prompts in demo).
- No clustering (`MapClusterLayer` stays unused).
- No `/sucursales/[slug]` route this slice (soft scope creep).

## Open Questions

None.

## Migration / Rollback

No data migration. `git revert` is safe. External `?tienda=...` links degrade to soft-fallback (no preselection) on revert.
