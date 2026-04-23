# Capability: stub-pages

**Status**: NEW.
**Surface**: `/servicios`, `/blog`, `/cuenta` pages + `<ComingSoon>` component + `getStoresByService` helper.

## Requirement 1 — getStoresByService

`src/lib/stores.ts` MUST expose `getStoresByService(service: StoreService): Store[]` returning stores whose `services` array includes the given service, preserving seed order.

### Scenario: Filters stores by service
- **Given** the seed data
- **When** `getStoresByService("pharmacy")` is called
- **Then** it returns only the "Las Condes" store (the only one with `pharmacy` in the seed)

### Scenario: Returns empty array when no store offers a service
- **Given** a synthetic service not used by any store
- **When** `getStoresByService` is called
- **Then** it returns `[]`

## Requirement 2 — Services Page Content

`/servicios` MUST render one card per `StoreService` key from `STORE_SERVICE_META` (4 cards). Each card MUST show the Spanish label, an icon, a short description, and the list of sucursales that ofrece ese servicio (nombre como link a `/sucursales?tienda={slug}`). The page MUST render a banner stating that online booking is "próximamente".

### Scenario: Four service cards rendered
- **Given** the current `STORE_SERVICE_META`
- **When** `/servicios` renders
- **Then** four cards appear with labels "Tienda", "Veterinaria", "Peluquería", "Farmacia"

### Scenario: Each card lists sucursales that offer that service
- **Given** the Veterinaria card
- **When** rendered
- **Then** it contains a link to `/sucursales?tienda=providencia` with accessible name "Providencia" (and similar for every store whose `services` contains `vet`)

### Scenario: Próximamente banner
- **Given** `/servicios` renders
- **When** inspected
- **Then** the DOM contains Spanish text that includes "Próximamente" and mentions online booking or "agendamiento"

## Requirement 3 — Blog Coming Soon

`/blog` MUST render a branded "próximamente" view with a heading, a short Spanish description, and at least three topic teasers. It MUST NOT render real blog articles.

### Scenario: Heading and teasers
- **Given** `/blog` renders
- **When** inspected
- **Then** the DOM contains a heading "Blog" (or similar) plus at least three teaser items; a visible "Próximamente" marker is present

## Requirement 4 — Cuenta Coming Soon

`/cuenta` MUST render a branded "próximamente" view with a heading, a short description, and a list of the upcoming features (pedidos, puntos, direcciones, mascotas). No auth forms are rendered.

### Scenario: Feature teasers rendered
- **Given** `/cuenta` renders
- **When** inspected
- **Then** the DOM contains Spanish teasers mentioning "pedidos", "puntos", "mascotas"

## Requirement 5 — Canonical Alternates

Each of the three pages MUST export metadata with `alternates.canonical` set to its respective path.

### Scenario: Servicios canonical
- **Given** `/servicios` metadata is evaluated
- **When** inspected
- **Then** `alternates.canonical === "/servicios"`

### Scenario: Blog canonical
- **Given** `/blog` metadata is evaluated
- **When** inspected
- **Then** `alternates.canonical === "/blog"`

### Scenario: Cuenta canonical
- **Given** `/cuenta` metadata is evaluated
- **When** inspected
- **Then** `alternates.canonical === "/cuenta"`
