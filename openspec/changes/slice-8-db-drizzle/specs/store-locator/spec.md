# Delta for store-locator

## MODIFIED Requirements

### Requirement 1 — Route Resolution

The `/sucursales` page MUST render as an RSC shell that lists all stores fetched asynchronously from the Postgres database via `getAllStores()` in `src/lib/stores.ts`, and mounts a client `<StoreLocator>` island. The page MUST read the async `searchParams` and pass a validated `initialSlug` to the client.
(Previously: stores sourced synchronously from `src/data/stores.ts` import)

#### Scenario: Page renders without a slug

- GIVEN no `?tienda` query param
- WHEN the user navigates to `/sucursales`
- THEN the page renders with all stores listed and no preselection

#### Scenario: Valid slug preselects a store

- GIVEN `?tienda=maipu`
- WHEN the client island mounts
- THEN the store with slug `maipu` is marked as selected, its card highlighted, and the map popup open at its coordinates

#### Scenario: Unknown slug is a soft fallback

- GIVEN `?tienda=slug-que-no-existe`
- WHEN the page loads
- THEN the page renders the list with no preselection (no redirect, no 404)

## ADDED Requirements

### Requirement: Async Store Data Access

`src/lib/stores.ts` MUST export `getAllStores(): Promise<Store[]>` and `getStoreBySlug(slug: string): Promise<Store | undefined>` backed by Drizzle queries. No caller outside `src/lib/stores.ts` MAY query the `stores` table directly.

#### Scenario: getAllStores returns all seeded stores

- GIVEN the DB is seeded with 4 stores
- WHEN `getAllStores()` is awaited
- THEN an array of 4 `Store` objects is returned

#### Scenario: getStoreBySlug returns undefined for missing slug

- GIVEN no store with slug `nonexistent`
- WHEN `getStoreBySlug("nonexistent")` is awaited
- THEN the return value is `undefined`

#### Scenario: Coordinates mapped from lat/lng columns

- GIVEN the Providencia store with `lat` and `lng` scalar columns in DB
- WHEN `getAllStores()` is awaited
- THEN each store object has `coordinates: { lat, lng }` matching the DB values

---

*(Requirements 2–12 from the main store-locator spec remain unchanged — marker rendering, card content, card click, marker click scroll, URL sync, mobile toggle, service badges, default viewport, metadata, accessibility, hydration safety all continue as specified. Only the data access contract in Requirement 1 and the new Requirement: Async Store Data Access above are changed or added.)*
