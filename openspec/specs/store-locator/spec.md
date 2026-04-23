# Capability: store-locator

**Status**: NEW (introduced by `slice-5-tiendas`).
**Surface**: `/sucursales` page; `<StoreLocator />` client island; `<StoreMap>`, `<StoreCard>`, `<StoreServiceBadge>`, `<StorePopupCard>` components; `src/lib/stores.ts` helpers.

## Requirement 1 — Route Resolution

The `/sucursales` page MUST render as an RSC shell that lists all stores fetched asynchronously from the Postgres database via `getAllStores()` in `src/lib/stores.ts`, and mounts a client `<StoreLocator>` island. The page MUST read the async `searchParams` and pass a validated `initialSlug` to the client.
(Library function returns async; internals currently read from seed data with TODO markers for future Drizzle query swap.)

### Scenario: Page renders without a slug
- **Given** no `?tienda` query param
- **When** the user navigates to `/sucursales`
- **Then** the page renders with all stores listed and no preselection

### Scenario: Valid slug preselects a store
- **Given** `?tienda=maipu`
- **When** the client island mounts
- **Then** the store with slug `maipu` is marked as selected, its card highlighted, and the map popup open at its coordinates

### Scenario: Unknown slug is a soft fallback
- **Given** `?tienda=slug-que-no-existe`
- **When** the page loads
- **Then** the page renders the list with no preselection (no redirect, no 404)

## Requirement 1a — Async Store Data Access

`src/lib/stores.ts` MUST export `getAllStores(): Promise<Store[]>` and `getStoreBySlug(slug: string): Promise<Store | undefined>` backed by async functions that coordinate with the data layer. No caller outside `src/lib/stores.ts` MAY directly access store data.
(Library functions return async signatures; internals currently read from seed data with TODO markers for future Drizzle query swap.)

### Scenario: getAllStores returns all seeded stores
- **Given** the data seed with 4 stores
- **When** `getAllStores()` is awaited
- **Then** an array of 4 `Store` objects is returned

### Scenario: getStoreBySlug returns undefined for missing slug
- **Given** no store with slug `nonexistent`
- **When** `getStoreBySlug("nonexistent")` is awaited
- **Then** the return value is `undefined`

### Scenario: Coordinates mapped from scalar columns
- **Given** the Providencia store with lat/lng scalar data
- **When** `getAllStores()` is awaited
- **Then** each store object has `coordinates: { lat, lng }` matching the data values

## Requirement 2 — Marker Rendering and Selection

Each store MUST have a marker positioned at `[coordinates.lng, coordinates.lat]`. Clicking a marker MUST select that store. The selected marker MUST be visually distinguishable from the unselected markers.

### Scenario: One marker per store
- **Given** the data seed with four stores
- **When** the map is rendered
- **Then** four markers appear, one per store

### Scenario: Click marker selects store
- **Given** no store is selected
- **When** the user clicks the Providencia marker
- **Then** the selected slug becomes `providencia`

### Scenario: Selected marker is distinguished
- **Given** `selectedSlug = "las-condes"`
- **When** the map renders
- **Then** the Las Condes marker has a distinct visual state (e.g., ring + scale) versus the other three

## Requirement 3 — Store Card Content

Each store card in the list MUST render: store name, commune, full address, phone as a `tel:` link, all configured services as badges, the optional `reference` text, and the three schedule lines (weekdays, saturday, sunday).

### Scenario: Card renders full store information
- **Given** the Providencia store
- **When** its card renders
- **Then** the DOM contains the name, commune "Providencia", address "Av. Providencia 2133", a `tel:+56223456789`-style link, badges for `shop`/`vet`/`grooming`, the reference text "A una cuadra del Metro Los Leones", and three schedule rows

### Scenario: Card omits optional reference when missing
- **Given** the Ñuñoa store (no `reference`)
- **When** its card renders
- **Then** no reference row is rendered

## Requirement 4 — Card Click Selects and Flies To

Clicking a card (or activating it via keyboard Enter/Space) MUST (a) set the selected slug, (b) imperatively fly the map to the store coordinates at zoom ≥ 14, and (c) open a controlled map popup anchored at that store.

### Scenario: Click card triggers flyTo and opens popup
- **Given** the Las Condes card
- **When** the user clicks the card
- **Then** `mapRef.flyTo({ center, zoom: 14, duration })` is invoked with Las Condes coordinates, a `<MapPopup>` renders at those coordinates, and the card gains `aria-current="true"` with a highlight ring

### Scenario: Keyboard activation works on cards
- **Given** a card has keyboard focus
- **When** the user presses Enter
- **Then** selection and flyTo happen as on click

## Requirement 5 — Marker Click Scrolls Card Into View

Clicking a marker MUST scroll the corresponding list card into view (`block: "nearest"`, `behavior: "smooth"`) and highlight it.

### Scenario: Marker click scrolls card
- **Given** a long list on mobile with a store out of viewport
- **When** the user clicks that store's marker
- **Then** the card scrolls into view and is highlighted

## Requirement 6 — URL Synchronization

The URL MUST reflect the selected store via `?tienda={slug}` for user-driven selection (marker click, card click). The URL MUST NOT change on map pan, zoom, bearing, or pitch events. Back/forward navigation MUST restore the correct selection and map state.

### Scenario: Click card updates URL
- **Given** `/sucursales`
- **When** the user clicks the Maipú card
- **Then** the URL becomes `/sucursales?tienda=maipu` via `router.replace(..., { scroll: false })`

### Scenario: Map pan does not write URL
- **Given** a selected store and an existing URL `?tienda=maipu`
- **When** the user drags the map to another area
- **Then** the URL remains `?tienda=maipu` unchanged

### Scenario: Back restores prior selection
- **Given** the user selected Providencia and then Las Condes
- **When** the user presses the browser Back button
- **Then** Providencia is selected again and its popup is open

## Requirement 7 — Mobile Map Toggle

On viewports narrower than the `md` Tailwind breakpoint, the list MUST be the primary surface and the map MUST be hidden by default. A visible "Mostrar mapa" / "Ocultar mapa" toggle button MUST reveal/hide the map. Selection MUST still work whether the map is visible or not.

### Scenario: Map hidden by default on mobile
- **Given** a viewport of 360px width
- **When** the page loads
- **Then** the list is visible, the map is not rendered, and a button labeled "Mostrar mapa" is visible

### Scenario: Toggle shows the map
- **Given** the mobile layout with the map hidden
- **When** the user taps "Mostrar mapa"
- **Then** the map becomes visible and the button label changes to "Ocultar mapa"

### Scenario: Selection from a card works on mobile
- **Given** the mobile layout with the map hidden
- **When** the user clicks a card
- **Then** the slug is selected and URL updates; the map (when next shown) reflects the selection

## Requirement 8 — Services Badges

Each configured service MUST render as a chip containing a Phosphor icon and a Spanish label. The mapping MUST be: `shop → "Tienda" + Storefront`, `vet → "Veterinaria" + FirstAid`, `grooming → "Peluquería" + Scissors`, `pharmacy → "Farmacia" + Pill`.

### Scenario: Badges render with icon + label
- **Given** the Las Condes store with services `["shop", "vet", "grooming", "pharmacy"]`
- **When** its card renders
- **Then** four badges appear with the Spanish labels "Tienda", "Veterinaria", "Peluquería", "Farmacia"

## Requirement 9 — Default Viewport and Theme

On first render the map MUST be centered over Santiago (roughly `[-70.65, -33.45]`) with a zoom level that shows all four stores. The map MUST use `theme="light"` explicitly to avoid theme-detection flicker.

### Scenario: Default viewport shows all stores
- **Given** no preselected slug
- **When** the map mounts
- **Then** the initial center is `[-70.65, -33.45]` and zoom ≈ 10 so that all four markers are within the visible viewport

### Scenario: Theme is light
- **Given** any page render
- **When** `<Map>` is instantiated
- **Then** it receives `theme="light"` as a prop

## Requirement 10 — Metadata

The page MUST export Next metadata with `title: "Sucursales"` and a description that lists the communes of all configured stores.

### Scenario: Description lists communes
- **Given** the current seed (Providencia, Las Condes, Ñuñoa, Maipú)
- **When** the page metadata is evaluated
- **Then** the description contains all four commune names

## Requirement 11 — Accessibility

Markers MUST be keyboard-activatable (Enter/Space) and expose `aria-label={store.name}` with `role="button"` and `tabIndex={0}`. Cards MUST render as native buttons (or equivalent) with accessible names. The map popup MUST expose a close button with an accessible label.

### Scenario: Marker keyboard activation
- **Given** a marker has keyboard focus
- **When** the user presses Enter
- **Then** the corresponding store is selected

### Scenario: Popup close button has label
- **Given** an open popup
- **When** a screen reader focuses the close control
- **Then** it announces a localized close label

## Requirement 12 — Hydration Safety

The page MUST render a stable, non-map shell during SSR and the first client render. The map primitive MAY mount only after hydration. No hydration mismatch warnings may appear.

### Scenario: Server HTML has no WebGL content
- **Given** the page is server-rendered
- **When** the initial HTML is returned
- **Then** no MapLibre canvas or WebGL-bound content exists in the server HTML (the map mounts on the client only)

### Scenario: Layout stable across hydration
- **Given** the page hydrates
- **When** the map appears
- **Then** the surrounding layout does not shift (the map container has a reserved height)
