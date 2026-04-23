# Tasks: slice-7-stub-polish

Strict TDD — per pair RED → GREEN.

## Phase 1 — Helper (2)
- [x] 1.1 RED: extend `src/lib/stores.test.ts` — `getStoresByService("pharmacy")` returns only Las Condes; unknown service returns `[]`.
- [x] 1.2 GREEN: add `getStoresByService` to `src/lib/stores.ts`.

## Phase 2 — ComingSoon (2)
- [x] 2.1 RED: `src/components/common/coming-soon.test.tsx` — renders `title`, `description`, and items count.
- [x] 2.2 GREEN: `src/components/common/coming-soon.tsx`.

## Phase 3 — Services page (2)
- [x] 3.1 RED: `src/app/servicios/page.test.tsx` — renders 4 cards, each card shows correct store links per service mapping, próximamente banner present, canonical metadata.
- [x] 3.2 GREEN: replace `src/app/servicios/page.tsx`.

## Phase 4 — Blog page (2)
- [x] 4.1 RED: `src/app/blog/page.test.tsx` — heading + ≥ 3 teasers + próximamente marker; canonical.
- [x] 4.2 GREEN: `src/app/blog/page.tsx`.

## Phase 5 — Cuenta page (2)
- [x] 5.1 RED: `src/app/cuenta/page.test.tsx` — heading + teasers (pedidos/puntos/mascotas) + próximamente; canonical.
- [x] 5.2 GREEN: `src/app/cuenta/page.tsx`.

## Gates
- `pnpm test` green.
- `pnpm lint` 0.
- `pnpm exec tsc --noEmit` 0.
