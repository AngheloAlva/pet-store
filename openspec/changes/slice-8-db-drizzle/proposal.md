# Proposal: Slice 8 — Migrate seed data to Neon Postgres + Drizzle ORM

## Intent

Replace the in-memory `src/data/*` seed arrays with a real PostgreSQL database (Neon) accessed via Drizzle ORM. This is infrastructure-only: end-user behavior must be identical to Phase 1. Unblocks Phase 2 (auth, checkout, admin CRUD) which all require a persistent store.

## Scope

### In Scope
- Drizzle schema for: `brands`, `categories`, `products`, `product_variants`, `product_images`, `product_categories` (junction), `stores`, `stock_levels`.
- `drizzle.config.ts` + `drizzle-kit` migration workflow.
- DB client singleton `src/db/index.ts` using `drizzle-orm/neon-http` + `@neondatabase/serverless`.
- Seed script `src/db/seed.ts` that reads existing `src/data/*` and populates Postgres (including cross-join stock expansion).
- Convert `src/lib/{catalog,stores,stock}.ts` helpers to async DB queries preserving current signatures (+ `Promise<>`).
- Fix 4 `@/data` leaks by adding `getAllProductSlugs()` and `getAllStores()` to lib layer.
- Update all RSC call sites to `await` lib helpers.
- Update unit tests to work against the new async API (DB-backed or mocked).
- Delete `src/data/*` after seed + migration verified.
- Document `.env.local` setup (`DATABASE_URL`).

### Out of Scope
- Auth, user accounts, sessions (Slice 9+).
- Admin CRUD, product editing UI (Slice 10+).
- Checkout, orders, payments (Phase 2).
- Cart persistence (stays client-side Zustand).
- Image upload / blob storage (images remain static paths).
- Full-text search infrastructure (pg `tsvector` — deferred).
- Connection pooling / WebSocket driver (not needed for read-only RSC).

## Capabilities

### New Capabilities
- `data-persistence`: Drizzle schema, migrations workflow, Neon HTTP client, seed script. Defines how entities are stored, related, and queried at the infrastructure level.

### Modified Capabilities
- `product-catalog`: data source changes from in-memory arrays to Postgres; lib helpers become async. Observable behavior unchanged but requirement phrasing must allow async data access.
- `store-locator`: same — `getAllStores()`, `getStoreBySlug()` become async DB reads.
- `product-detail`: `generateStaticParams` now calls async `getAllProductSlugs()`.

## Approach

Big Bang (Approach 1 from exploration): one slice migrates everything at once. Rationale: abstraction layer already isolates data access, dataset is tiny (~40 products, ~35 stock exceptions), no production traffic at risk, async conversion must be consistent across callers anyway.

Driver: `drizzle-orm/neon-http` (stateless HTTP, edge-compatible, zero pool management). Embedded composite fields (`Money`, `Quantity`, `Coordinates`) decompose into scalar columns. Bounded string-union arrays (`tags`, `species`, `services`, `targetSize`) use PG `text[]` with `&&` overlap operators. `StoreSchedule` stored as JSONB (no query requirement). Stock is a full cross-join `(variant_id, store_id)` table — seed expands all combos then applies the 35 exceptions.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/db/schema.ts` | New | Drizzle table definitions + relations |
| `src/db/index.ts` | New | Neon HTTP client singleton |
| `src/db/seed.ts` | New | Seed script reading `src/data/*` |
| `drizzle.config.ts` | New | drizzle-kit config |
| `src/lib/catalog.ts` | Modified | All queries become async DB calls |
| `src/lib/stores.ts` | Modified | Async DB queries + new `getAllStores()` |
| `src/lib/stock.ts` | Modified | Query `stock_levels` table directly |
| `src/app/producto/[slug]/page.tsx` | Modified | Use `getAllProductSlugs()` |
| `src/app/sitemap.ts` | Modified | Use `getAllProductSlugs()` |
| `src/app/sucursales/page.tsx` | Modified | Use `getAllStores()` |
| `src/data/*` | Removed | After seed verified |
| Tests | Modified | Mock DB or use integration fixtures |
| `.env.local` / `.env.example` | New | `DATABASE_URL` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Async conversion misses a caller | Med | TypeScript compile catches missing `await` (Promise type); run full typecheck |
| `generateStaticParams` can't reach DB at build | Low | Neon HTTP works at build time; ensure `DATABASE_URL` in Vercel build env |
| Stock cross-join seed bug | Med | Unit test seed script against fixture; compare row count = variants × stores |
| Tests break en masse | High | Budget a task for test refactor; mock `src/db` module or use in-memory test DB |
| Drizzle query ≠ in-memory filter semantics | Med | Port `queryProducts` with PG-native filters; snapshot compare result sets against seed behavior |
| PG `text[]` vs junction regret later | Low | Arrays chosen for bounded sets; migration path to junction exists if needed |
| `DATABASE_URL` missing in CI / preview | Med | Document setup; fail fast with clear error in `src/db/index.ts` |

## Rollback Plan

Revert the slice branch. `src/data/*` is preserved in git history until the final cleanup commit — rollback before that commit restores full in-memory mode. After cleanup commit, rollback requires restoring `src/data/*` from git and reverting lib files to sync. Keep the "delete `src/data/*`" as the LAST commit in the slice for easy single-commit revert.

## Dependencies

- Neon Postgres project provisioned (free tier sufficient).
- `DATABASE_URL` set in `.env.local` and Vercel env.
- npm packages: `drizzle-orm`, `drizzle-kit` (dev), `@neondatabase/serverless`.

## Success Criteria

- [ ] `npm run dev` and `npm run build` succeed with DB as sole data source.
- [ ] All Phase 1 pages render identical content (manual smoke: home, catalog, product, sucursales, sitemap).
- [ ] Zero imports from `@/data/*` in `src/app/**` or `src/lib/**` (grep clean).
- [ ] `src/data/*` deleted.
- [ ] Full TypeScript strict build passes.
- [ ] Unit test suite passes against new async API.
- [ ] `drizzle-kit generate` + `push`/`migrate` workflow documented in README.
- [ ] Seed script is idempotent (re-runnable without duplicates).
