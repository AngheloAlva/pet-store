## Exploration: slice-7-stub-polish

### Current State

Three pages listed in the main nav still render placeholder text, which looks unfinished when a prospect navigates the demo:
- `/servicios` → "Fase 2 — agendamiento online."
- `/blog` → "Fase 2 — contenido SEO."
- `/cuenta` → "Fase 3 — historial, pedidos, puntos, mascotas."

Data available for reuse:
- `src/data/stores.ts` — each store exposes `services: Array<"shop" | "vet" | "grooming" | "pharmacy">`.
- `src/lib/stores.ts` — `STORE_SERVICE_META` with Spanish labels + Phosphor icons (SSR-safe entry).
- `src/lib/site.ts` — `siteConfig.nav` drives the header.

### Affected Areas

- `src/app/servicios/page.tsx` — replace placeholder with informational page: 4 service cards (Tienda, Veterinaria, Peluquería, Farmacia) each with description + list of sucursales that ofrece ese servicio. Banner de "agendamiento online próximamente".
- `src/app/blog/page.tsx` — branded "próximamente" page with a few topic teasers.
- `src/app/cuenta/page.tsx` — branded "próximamente" page with feature teasers (pedidos, puntos, mascotas).
- `src/lib/stores.ts` — small helper `getStoresByService(service)` for the services page.
- `src/components/common/coming-soon.tsx` (NEW) — shared "próximamente" layout reused by `/blog` and `/cuenta`.

### Approach

Scope is cosmetic-only. No new features, no booking flow, no auth. The three pages stay statically rendered (RSC) with metadata and canonical URLs. Tests focus on structural content (headings, copy, link targets, service ↔ store mapping).

### Risks

- Minimal. Worst case: stale copy when the business adds a new service — mitigated by driving from `STORE_SERVICE_META`.

### Ready for Proposal

Yes. Single session implementation.
