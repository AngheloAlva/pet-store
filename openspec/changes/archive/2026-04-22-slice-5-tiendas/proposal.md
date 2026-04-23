# Proposal: Slice 5 — Tiendas (Store Locator)

## Intent

Hoy `/sucursales` es un placeholder ("Mapa y listado — Slice 5"). El demo necesita mostrar dónde están las 4 tiendas físicas de SimplePet en Santiago con mapa interactivo + lista editable, y permitir compartir un link que abra una sucursal específica. Sin esto, el cliente potencial no ve el lado "omnicanal" del negocio.

## Scope

### In Scope
- Página `/sucursales` con mapa MapLibre (primitive existente) + lista de tarjetas.
- Sincronización bidireccional marker ↔ card (click en cualquiera selecciona, resalta y hace `flyTo`).
- URL param `?tienda={slug}` como fuente de verdad para la selección (deep-link + back/forward).
- Mobile: lista primaria + toggle "Mostrar mapa".
- Helpers puros en `src/lib/stores.ts` (`getStoreBySlug`, `DEFAULT_MAP_VIEWPORT`, metadata description).
- Servicios: badges con iconos Phosphor y labels en español.
- A11y completa (markers keyboard-activatables, cards focuseables, popup con close).

### Out of Scope
- Stock por sucursal en la página (ya existe `getProductStockMatrix`, se muestra sólo en PDP).
- Geolocalización del usuario / rutas / distancias.
- Dark mode del mapa (next-themes instalado pero sin `ThemeProvider` — `theme="light"` fijo).
- Clustering de markers (4 tiendas no lo justifica).
- Ruta `/sucursales/[slug]` dedicada por tienda.

## Capabilities

### New Capabilities
- `store-locator`: Página `/sucursales` con mapa + lista, selección URL-driven, mobile toggle, servicios badges, a11y.

### Modified Capabilities
- None.

## Approach

RSC `page.tsx` lee `await searchParams`, valida el slug y pasa `initialSlug` al cliente `<StoreLocator/>`. El island mantiene `useState<selectedSlug>` y sincroniza la URL con `router.replace(..., { scroll: false })` en cambios user-driven. Map en modo no controlado con `forwardRef` — `flyTo({ center, zoom: 14, duration: 800 })` imperativo. Popup top-level `<MapPopup>` controlado por la selección (no `<MarkerPopup>` porque la primitive no expone el marker ref). Tests mockean `@/components/ui/map` para esquivar WebGL en jsdom; el resto (cards, badges, helpers, orquestador) se testea con el primitive mockeado o en aislamiento.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/sucursales/page.tsx` | Modified | Reemplaza placeholder: RSC + `await searchParams` + `<StoreLocator initialSlug />`. |
| `src/app/sucursales/store-locator.tsx` | New | Client island; orquesta selección, URL sync, flyTo, mobile toggle. |
| `src/components/stores/store-map.tsx` | New | Wrapper de `<Map>` con `forwardRef` + markers + `<MapPopup>` controlado. |
| `src/components/stores/store-card.tsx` | New | Tarjeta con nombre/dirección/servicios/horario + selección. |
| `src/components/stores/store-service-badge.tsx` | New | Chip icono + label. |
| `src/components/stores/store-popup-card.tsx` | New | Mini card para el `MapPopup`. |
| `src/lib/stores.ts` | New | `getStoreBySlug`, `DEFAULT_MAP_VIEWPORT`, `STORE_SERVICE_META`, `getStoresCommuneSummary`. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| WebGL ausente en jsdom → tests crashean al montar `<Map>` | High | `vi.mock("@/components/ui/map", ...)` en test del orquestador; cards/badges/helpers se testean sin Map. |
| URL feedback loop (pan del mapa → URL → fly-to → pan…) | Med | Sincronizar URL solo en clicks explícitos; NO en `onViewportChange`. |
| `MarkerPopup` no se puede abrir programáticamente | High | Usar `<MapPopup>` top-level controlado por `selectedSlug`; `onClose` setea `selectedSlug = null`. |
| `next-themes` sin provider → detección de tema falla | Low | Pasar `theme="light"` explícito al `<Map>`. |
| Hydration mismatch por Map (WebGL solo-cliente) | Low | Primitive guarda `typeof document === "undefined"`; el page renderiza shell estático mientras WebGL inicia (loader propio). |
| URL con `?tienda=slug-invalido` | Med | `getStoreBySlug` devuelve `undefined` → renderiza lista sin preselección (no 404). |

## Rollback Plan

`git revert` del commit del slice. `/sucursales` vuelve al placeholder. Sin migraciones de datos ni esquemas externos. Link `?tienda=…` quedaría colgado en historiales de usuarios pero el fallback soft-fail hace que no rompa.

## Dependencies

- `maplibre-gl@^5.23.0` ya instalado.
- `src/components/ui/map.tsx` ya implementado.
- `src/data/stores.ts` con 4 stores + coordenadas reales.

## Success Criteria

- [ ] `/sucursales` renderiza mapa + lista con las 4 tiendas.
- [ ] Click en marker → card se scrollea y se resalta.
- [ ] Click en card → map hace `flyTo` y abre popup.
- [ ] `?tienda=maipu` deep-link preselecciona la tienda en mount.
- [ ] Slug inválido en URL no rompe la página.
- [ ] Mobile: "Mostrar mapa" toggle funciona; selección sigue funcionando con ambos layouts.
- [ ] `pnpm test` verde; `pnpm lint` 0 warnings; `pnpm exec tsc --noEmit` limpio.
- [ ] A11y: markers con keyboard + aria-label; popup con close; cards con focus visible.
