# Tasks: slice-8b-lib-swap — Replace `@/data` with Drizzle in lib layer

## Phase 1: Inline Test Fixtures

- [x] 1.1 Read `src/data/{products,brands,categories,stores,stock}.ts` and `src/test/fixtures/index.ts` to understand current re-export shape.
- [x] 1.2 Copy raw constant arrays from `src/data/*` inline into `src/test/fixtures/index.ts`; remove all `from "@/data"` re-exports; keep all exported names identical.
- [x] 1.3 Verify: `rg "@/data" src/test/` returns 0; `pnpm exec tsc --noEmit` passes.

## Phase 2: Mappers

- [x] 2.1 Create `src/db/mappers.ts` — export `mapProduct`, `mapBrand`, `mapCategory`, `mapStore`, `mapStockLevel`.
- [x] 2.2 `mapProduct`: flatten `productCategories` junction → `categoryIds[]`; compose `price: { amount, currency }`; compose `quantity: { value: parseFloat(qv), unit }`; cast `species as Species[]`, `tags as ProductTag[]`.
- [x] 2.3 `mapStore`: `parseFloat(lat)`, `parseFloat(lng)` → `coordinates`; cast `schedule as StoreSchedule`.
- [x] 2.4 `mapBrand`: `logo_url ? { url, alt } : undefined` → `logo?: Image`.
- [x] 2.5 `mapStockLevel`: join store row into typed `StockLevel` shape.
- [x] 2.6 Verify: all mapper return types satisfy their TS interfaces (use `satisfies`); `pnpm exec tsc --noEmit` passes.

## Phase 3: Async Loaders (react cache)

- [x] 3.1 Create `src/db/loaders.ts` — `loadAllProducts`, `loadAllBrands`, `loadAllCategories`, `loadAllStores`, `loadAllStockLevels`, each wrapped in `cache()` from `react`.
- [x] 3.2 `loadAllProducts`: `db.query.products.findMany({ with: { variants: true, images: true, productCategories: true } })` → `mapProduct` each row.
- [x] 3.3 `loadAllBrands`: `db.query.brands.findMany()` → `mapBrand` each row.
- [x] 3.4 `loadAllCategories`: `db.query.categories.findMany()` (flat; tree is derived in lib).
- [x] 3.5 `loadAllStores`: `db.query.stores.findMany()` → `mapStore` each row.
- [x] 3.6 `loadAllStockLevels`: `db.query.stockLevels.findMany({ with: { store: true } })` → `mapStockLevel` each row.
- [x] 3.7 Verify: `pnpm exec tsc --noEmit` passes; no `any`.

## Phase 4: Sync-Backing Module Cache

- [x] 4.1 In `src/db/loaders.ts`, add module-level maps: `let _products: Product[] = []`, `_brands`, `_categories`, `_stores`, `_stockLevels`.
- [x] 4.2 Export `initSyncCache(): Promise<void>` that awaits all loaders and populates the maps; export sync getters `getCachedProducts()`, `getCachedBrands()`, etc.
- [x] 4.3 Call `initSyncCache()` from the RSC entry point (root layout `src/app/layout.tsx`) so the cache is hydrated before sync helpers run.
- [x] 4.4 Verify: `getVariantTotalStock` can read `_stockLevels` synchronously with no `await`; cart store path unaffected.

## Phase 5: Swap catalog.ts

- [x] 5.1 In `src/lib/catalog.ts`, replace `from "@/data"` with `from "@/db/loaders"` (async loaders) and `from "@/db/mappers"` where needed.
- [x] 5.2 All `*Async` functions: `await` the relevant loader, apply existing in-memory filter/sort/paginate logic unchanged.
- [x] 5.3 `queryProducts` stays sync: read `getCachedProducts()`, apply existing filter logic. Signature unchanged.
- [x] 5.4 All sync helpers (`getBrand`, `getTopLevelCategories`, etc.): switch to `getCachedProducts()` / `getCachedBrands()` / `getCachedCategories()`.
- [x] 5.5 Verify: no `from "@/data"` in `catalog.ts`; `pnpm exec tsc --noEmit` passes.

## Phase 6: Swap stores.ts

- [x] 6.1 In `src/lib/stores.ts`, replace `from "@/data"` with loaders/cache getters.
- [x] 6.2 `getAllStores` / `getStoreBySlugAsync`: `await loadAllStores()`.
- [x] 6.3 Sync helpers (`getStoreBySlug`, `getStoresCommuneSummary`, `getStoresByService`): use `getCachedStores()`.
- [x] 6.4 Verify: no `from "@/data"` in `stores.ts`; `pnpm exec tsc --noEmit` passes.

## Phase 7: Swap stock.ts

- [x] 7.1 In `src/lib/stock.ts`, replace `from "@/data"` with loaders/cache getters.
- [x] 7.2 `getProductStockMatrixAsync`, `isVariantGloballyOutOfStockAsync`, `getVariantTotalStockAsync`: `await loadAllStockLevels()`.
- [x] 7.3 Sync `getVariantTotalStock` / `isVariantGloballyOutOfStock` / `getProductStockMatrix`: use `getCachedStockLevels()`. No signature change. Added fallback to in_stock for unknown variantIds.
- [x] 7.4 Verify: no `from "@/data"` in `stock.ts`; `pnpm exec tsc --noEmit` passes.

## Phase 8: Migrate Test Imports

- [x] 8.1 `rg -l '"@/data"' src/` to list all ~12 affected test files.
- [x] 8.2 For each file: replace `from "@/data"` with `from "@/test/fixtures"`. No logic changes.
- [x] 8.3 Added global `vi.mock("@/db")` and `vi.mock("@/db/loaders")` in `src/test/setup.ts` returning fixture data — all sync lib helpers work without a DB.
- [x] 8.4 Run `pnpm test` — all 223 suites green.

## Phase 9: Full Verification

- [x] 9.1 `rg "@/data" src/` → returns 0 results.
- [x] 9.2 `pnpm exec tsc --noEmit` → 0 errors.
- [x] 9.3 `pnpm lint` → 0 errors.
- [x] 9.4 `pnpm test` → all 223 tests green.
- [ ] 9.5 Manual smoke: `/catalogo`, `/sucursales`, `/carrito` render correctly; add-to-cart sync path works.

## Phase 10: Cleanup

- [x] 10.1 Delete `src/data/` directory in an isolated commit (easy single-revert target).
- [x] 10.2 Update `docs/FASE_2.md` — tick the slice-8b-lib-swap checkbox.
- [ ] 10.3 Final `pnpm build` — 0 errors, 0 type errors.
