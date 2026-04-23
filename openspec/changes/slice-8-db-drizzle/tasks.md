# Tasks: slice-8-db-drizzle

## Batch 1: Infra setup (deps, drizzle config, env validation)

- [x] 1.1 Add deps to `package.json`: `drizzle-orm`, `@neondatabase/serverless`, `zod`; add devDeps: `drizzle-kit`, `tsx`; add scripts `db:generate`, `db:push`, `db:migrate`, `db:seed`.
  - Verify: `pnpm install` succeeds; `pnpm drizzle-kit --version` prints version.
- [x] 1.2 Create `src/env.ts` — Zod schema parsing `process.env`; export `env`; throw on missing `DATABASE_URL`.
  - Verify: `pnpm typecheck` zero errors; `DATABASE_URL='' pnpm tsx src/env.ts` exits non-zero.
- [x] 1.3 Create `drizzle.config.ts` — imports `env.DATABASE_URL`; points `schema` at `src/db/schema.ts`, `out` at `drizzle/`.
  - Verify: `pnpm db:generate` resolves config without errors (schema may be empty stub).
- [x] 1.4 Create `.env.local.example` documenting `DATABASE_URL=postgresql://...`; add `.env.local` to `.gitignore` if absent.

## Batch 2: Schema definition (Drizzle tables, relations, indexes)

- [x] 2.1 Create `src/db/schema.ts` — define `brands`, `categories`, `products` tables with all scalar columns per design.
- [x] 2.2 Add `product_categories` (junction), `product_images`, `product_variants` tables with FK refs and indexes.
  - Verify: `pnpm typecheck` zero errors after each file save.
- [x] 2.3 Add `stores` table (lat/lng as `numeric`, schedule as `jsonb`, services as `text[]`).
- [x] 2.4 Add `stock_levels` table — composite PK `(variant_id, store_id)`, status `text`, idx on `store_id`.
- [x] 2.5 Add Drizzle `relations()` definitions for all FK edges.
  - Verify: `pnpm db:generate` produces SQL in `drizzle/`; no TS errors.

## Batch 3: DB client + migrations

- [x] 3.1 Create `src/db/index.ts` — module-level singleton: `neon(env.DATABASE_URL)` → `drizzle(sql, { schema })`; export `db`.
  - Verify: missing `DATABASE_URL` throws `Error` containing `"DATABASE_URL"` at import time.
- [x] 3.2 Run `pnpm db:generate` — commit generated SQL files in `drizzle/`.
- [ ] 3.3 Run `pnpm db:push` against Neon dev branch — verify tables exist in Neon console.
  - SKIPPED: DATABASE_URL not provisioned yet. User does this after setting up Neon.
  - Verify: `rg "CREATE TABLE" drizzle/` shows all 8 tables. ✅ (confirmed in generated SQL)

## Batch 4: Seed script (idempotent, full variant×store stock)

- [x] 4.1 Create `src/test/fixtures/index.ts` — snapshot exports from `src/data/*` (brands, categories, products, stores, stock) as typed const fixtures; used by seed AND tests.
- [x] 4.2 Create `src/db/seed.ts` — reads fixtures; `INSERT ... ON CONFLICT DO UPDATE` for all tables; derives `stock_levels` as full variant×store cross-join minus 35 exceptions.
- [ ] 4.3 Run `pnpm db:seed`; verify row counts match expectations.
  - SKIPPED: DATABASE_URL not provisioned yet. User does this after setting up Neon.

## Batch 5: Async lib migration (`src/lib/catalog.ts`, `stores.ts`, `stock.ts`)

- [x] 5.1 Rewrite `src/lib/catalog.ts` — async functions `getAllProductSlugs`, `getProductBySlugAsync`, `getAllBrandsAsync`, etc. with `cache()`; add `getAllProductSlugs(): Promise<string[]>`. Internally still reads from `src/data` (TODO marker in place).
- [x] 5.2 Rewrite `src/lib/stores.ts` — `getAllStores()` and `getStoreBySlugAsync()` async; sync `getStoreBySlug` preserved; wrap with `cache()`.
- [x] 5.3 Rewrite `src/lib/stock.ts` — async wrappers `getProductStockMatrixAsync`, `isVariantGloballyOutOfStockAsync`, `getVariantTotalStockAsync`; sync versions preserved.
  - Verify: `pnpm typecheck` zero errors ✅; `@/data` imports remain in lib internals (intentional — swapped in follow-up).

## Batch 6: Fix 4 `@/data` leaks in app pages

- [x] 6.1 `src/app/producto/[slug]/page.tsx` — replace direct `@/data` import with `getAllProductSlugs()` from `src/lib/catalog`; `generateStaticParams` now `async`.
- [x] 6.2 `src/app/sitemap.ts` — replace `@/data` import with `getAllProductSlugs()` from `src/lib/catalog`; `sitemap()` now `async`.
- [x] 6.3 `src/app/sucursales/page.tsx` — replace `@/data` import with `getAllStores()` from `src/lib/stores`.
- [x] 6.4 Audit remaining app pages — `@/data` leaks in `src/app/` are zero ✅; lib internals import from `@/data` intentionally (follow-up task).
  - Verify: `pnpm typecheck` passes ✅; `pnpm build` succeeds ✅.

## Batch 7: Test refactor (vi.mock fixtures)

- [x] 7.1 Update `src/lib/catalog.test.ts` — added `getAllProductSlugs` async tests; existing sync tests unchanged and passing.
- [x] 7.2 Update `src/lib/stores.test.ts` — added `getAllStores` and `getStoreBySlugAsync` async tests.
- [x] 7.3 Update `src/lib/stock.test.ts` — added async helper tests (`getProductStockMatrixAsync`, `isVariantGloballyOutOfStockAsync`, `getVariantTotalStockAsync`).
- [x] 7.4 Update `src/app/producto/[slug]/page.test.ts` — mock `@/lib/catalog` helpers; `generateStaticParams` tested as async Promise.
  - Verify: `pnpm test` passes — 223 tests, 44 files ✅.

## Batch 8: Cleanup (delete `src/data/*`, update docs)

- [ ] 8.1 Delete all files in `src/data/` (`brands.ts`, `categories.ts`, `index.ts`, `products.ts`, `stock.ts`, `stores.ts`).
  - BLOCKED: Requires DATABASE_URL + successful seed first. User does this in follow-up.
- [ ] 8.2 Update `docs/FASE_2.md` — mark slice-8 tasks complete; note Neon `DATABASE_URL` must be set in Vercel env vars before deploy.
- [ ] 8.3 Single commit for deletion — easy single-revert rollback point if DB unreachable in prod.
