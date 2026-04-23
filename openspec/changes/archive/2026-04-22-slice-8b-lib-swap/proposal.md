# Proposal: Slice 8B — Swap `@/data` for Drizzle in lib layer

## Intent

Slice 8 landed DB infra (schema, Neon, seed); tables are populated but unused. `src/lib/{catalog,stores,stock}.ts` still read from `src/data/*` in-memory modules. This slice makes the DB the real source of truth by routing all reads through Drizzle, without changing public lib signatures or call sites. Fixtures become the canonical test-only copy of the data, freeing the production code from `@/data`.

## Scope

### In Scope
- Replace `@/data` imports inside `src/lib/catalog.ts`, `src/lib/stores.ts`, `src/lib/stock.ts` with Drizzle relational queries (`db.query.X.findMany({ with: ... })`)
- Row-to-nested-object mappers per exploration's field-mismatch table (numeric strings → numbers, JSONB casts, nested `price`/`quantity`/`coordinates`/`logo`)
- Wrap hot async paths with React `cache()` for per-request dedup
- Cached full-product loader feeding the sync `queryProducts` so it stays sync
- Migrate `src/test/fixtures/index.ts` to inline static constants (sever dependency on `@/data`)
- Update ~12 test files: `from "@/data"` → `from "@/test/fixtures"`
- Delete `src/data/*` in final isolated commit
- Update `docs/FASE_2.md` checklist

### Out of Scope
- Changes to public lib function signatures (sync stays sync, async stays async)
- Changes to callers in `src/app/`, `src/components/`, `src/stores/`
- `unstable_cache` / tag-based invalidation (deferred)
- SQL-side filtering for `queryProducts` (Option B, deferred)
- Admin CRUD / write paths (Slice 11+)

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None at the requirement level. This is a pure data-source refactor — observable behavior of `product-catalog`, `product-detail`, `store-locator`, `cart`, `data-persistence` is unchanged. No spec deltas needed.

## Approach

Drizzle relational query API (`db.query.X.findMany({ with: ... })`) for every read; thin mapper functions reshape row output into existing TS types. `react cache()` wraps each async loader so a single RSC render does one SQL call per entity group. Sync helpers (`getVariantTotalStock`, `queryProducts`, `getBrand`, etc.) stay sync by consuming a module-level cache populated by async loaders — callers unchanged. Fixtures move from re-exports to inline constants so `@/data` can be deleted cleanly.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/catalog.ts` | Modified | Async fns → Drizzle; sync fns → fixture/cache-backed |
| `src/lib/stores.ts` | Modified | Async fns → Drizzle; mapper for coordinates + schedule |
| `src/lib/stock.ts` | Modified | Async fns → Drizzle; sync helpers stay for cart store |
| `src/test/fixtures/index.ts` | Modified | Inline constants, no `@/data` imports |
| `src/**/*.test.{ts,tsx}` (~12 files) | Modified | Import swap `@/data` → `@/test/fixtures` |
| `src/data/*` | Removed | Deleted in final commit |
| `docs/FASE_2.md` | Modified | Checklist update |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Cart sync dependency (`getVariantTotalStock` called from Zustand) | High | Keep sync version backed by fixture-shaped cache; never make it async |
| Numeric coercion (`price_amount`, `quantity_value`, `lat/lng`) silently stringifies | Medium | Centralize `parseFloat` in mappers; add unit tests on mapper |
| JSONB `schedule` / `nutritional_analysis` type drift | Medium | Cast via `satisfies` at mapper boundary; seed is typed so shape is stable |
| Test migration surface (~12 files) introduces regressions | Medium | Mechanical find-replace; run full test suite before `@/data` deletion |
| `queryProducts` staying sync requires an eager full-product cache | Medium | Use RSC-invoked async loader that hydrates a `cache()`-wrapped store; document the seam |
| N+1 on `getRelatedProductsAsync` | Low | Single `findMany` with `inArray` on brand/species/category |

## Rollback Plan

Each step is an isolated commit: (1) fixtures inlined, (2) test imports swapped, (3) `catalog.ts` swap, (4) `stores.ts` swap, (5) `stock.ts` swap, (6) `src/data/*` deleted. Revert the offending commit; earlier commits remain viable because `@/data` still exists until step 6.

## Dependencies

- Slice 8 (schema + Neon + seed) — DONE
- `DATABASE_URL` configured in dev and CI

## Success Criteria

- [ ] App behaves identically across all pages (`/catalogo`, `/producto/[slug]`, `/sucursales`, `/carrito`, home)
- [ ] Zero `@/data` imports in `src/` (grep clean)
- [ ] `src/data/` directory removed
- [ ] All tests green (`pnpm test`)
- [ ] Typecheck green (`pnpm typecheck`)
- [ ] Cart store still works synchronously (add-to-cart path unchanged)
- [ ] `docs/FASE_2.md` checkbox ticked
