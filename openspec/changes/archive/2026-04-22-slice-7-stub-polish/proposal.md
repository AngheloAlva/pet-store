# Proposal: slice-7-stub-polish

## Intent

Los 3 stubs (`/servicios`, `/blog`, `/cuenta`) están linkeados en el nav y muestran placeholders crudos cuando un prospect los clickea. Cerrar ese gap visual para que el demo no tenga agujeros navegables.

## Scope

### In Scope
- `/servicios`: página informativa con los 4 servicios (Tienda, Veterinaria, Peluquería, Farmacia) + lista de sucursales que ofrecen cada uno. Nota de "agendamiento online próximamente".
- `/blog`: "próximamente" branded con 3-4 teasers de guías futuras.
- `/cuenta`: "próximamente" branded con teasers de features (pedidos, puntos, mascotas).
- Shared `ComingSoon` component para blog + cuenta.
- Helper `getStoresByService(service)` en `src/lib/stores.ts`.
- Canonical alternates en las 3 páginas.

### Out of Scope
- Agendamiento de servicios (Fase 2).
- Contenido real del blog (Fase 2).
- Auth / cuenta de usuario (Fase 3).
- Formularios.

## Capabilities

### New Capabilities
- `stub-pages`: página informativa de servicios + páginas "próximamente" para blog y cuenta; helper `getStoresByService`.

### Modified Capabilities
- None.

## Approach

RSC puras. `/servicios` itera `STORE_SERVICE_META` + llama `getStoresByService(key)` para listar sucursales. `/blog` y `/cuenta` renderizan `<ComingSoon title icon items />`. Tests structural (headings, links, mapping servicio→tiendas).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/servicios/page.tsx` | Modified | Página informativa real. |
| `src/app/blog/page.tsx` | Modified | Branded coming soon. |
| `src/app/cuenta/page.tsx` | Modified | Branded coming soon. |
| `src/components/common/coming-soon.tsx` | New | Layout compartido. |
| `src/lib/stores.ts` | Modified | + `getStoresByService`. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Copy drifts | Low | Derive services from `STORE_SERVICE_META`. |
| Hydration issues | Low | RSC puras, sin client state. |

## Rollback

`git revert` — vuelve a los stubs. Sin migraciones.

## Success Criteria

- [ ] Los 3 stubs muestran contenido real.
- [ ] `/servicios` lista las 4 sucursales cuando corresponde por servicio.
- [ ] `pnpm test` verde; lint 0; tsc 0.
