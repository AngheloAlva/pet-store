# Design: slice-7-stub-polish

## Decisions

1. **RSC everywhere**. No client state in these pages. Respect the Phosphor SSR convention (`@phosphor-icons/react/dist/ssr`).
2. **Services page** iterates `Object.keys(STORE_SERVICE_META) as StoreService[]`. Per service: `getStoresByService(service)` → list of sucursales. Services card layout mirrors `StoreServiceBadge` styling but larger (icon circle + label + description + links).
3. **`getStoresByService`** is a trivial filter over `stores`. Added next to the existing helpers in `src/lib/stores.ts`.
4. **Service descriptions** live in a local `SERVICE_DESCRIPTIONS: Record<StoreService, string>` near the page component. Not exported (page-local copy).
5. **Shared `<ComingSoon>`** for `/blog` and `/cuenta`. Props: `title`, `description`, `Icon`, `items: Array<{ title, description }>`. RSC, no state.
6. **Canonical metadata** added to each page's `metadata` export.
7. **Tests**: unit for `getStoresByService`; RTL for each page's structural content (with Phosphor imports via `/dist/ssr` so they render without client tree).

## Structure

```
src/components/common/coming-soon.tsx         # "próximamente" layout
src/app/servicios/page.tsx                    # real content
src/app/blog/page.tsx                         # ComingSoon instance
src/app/cuenta/page.tsx                       # ComingSoon instance
src/lib/stores.ts                             # + getStoresByService
```

## Tests

- `src/lib/stores.test.ts` — extend with 2 scenarios for `getStoresByService`.
- `src/app/servicios/page.test.tsx` — renders 4 cards, each card shows store links that match the service↔store mapping, próximamente banner present.
- `src/app/blog/page.test.tsx` — heading + ≥ 3 teasers + "Próximamente" marker.
- `src/app/cuenta/page.test.tsx` — heading + teasers mentioning pedidos/puntos/mascotas.
- `src/components/common/coming-soon.test.tsx` — renders props (title, description, items count).
