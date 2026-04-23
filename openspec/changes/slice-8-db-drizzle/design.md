# Design: Slice 8 — Neon Postgres + Drizzle

## Technical Approach

Introduce `src/db/` (schema + client singleton + seed). Replace `src/data/*` arrays with Neon Postgres accessed via `drizzle-orm/neon-http`. `src/lib/{catalog,stores,stock}.ts` become async, wrapped with React `cache()` for per-request memoization. Four direct `@/data` leaks in `src/app/**` relocate to new lib helpers. Big-bang migration in a single slice.

## Architecture Decisions

| # | Topic | Choice | Alternatives | Rationale |
|---|-------|--------|--------------|-----------|
| 1 | Driver | `drizzle-orm/neon-http` + `@neondatabase/serverless` | `neon-ws` + pooled Pg, `postgres-js` | Stateless HTTP fits RSC + build-time `generateStaticParams`; no pool to leak in serverless; edge-compatible. Transactions (cart/orders) deferred to Phase 2. |
| 2 | Bounded unions (`species`, `tags`, `services`, `targetSize`) | PG `text[]` | Junction tables, PG enums | Enum is closed: migrations cost for every new tag. Junction = 4 extra tables for filter-only data. `text[]` + `&&`/`@>` covers all current queries. Regret path = backfill into junction with one migration. |
| 3 | `categoryIds` | Junction `product_categories(product_id, category_id)` | `text[]` | Categories have their own entity (slug, parentId, tree traversal), referential integrity matters, and `getCategoryWithDescendants()` wants SQL joins later. |
| 4 | `stock_by_store` | Full cross-join `stock_levels(variant_id, store_id, status)` composite PK | Sparse exceptions + default | Matches current UI (`getProductStockMatrix` iterates all stores). Explicit rows are queryable and indexable. Seed expands (~40 variants × ~6 stores) — trivial size. |
| 5 | `Store.schedule` | JSONB | 3 columns, schedule table | Opaque blob, never filtered by SQL. JSONB keeps a single row write and typed hydration via Zod. |
| 6 | `Product.images`, `Product.variants` | Child tables (`product_images`, `product_variants`) with `sort_order` | JSONB | Variants are FK targets for `stock_levels` and carts; images need ordering and alt text. Normalization required. |
| 7 | Composite value objects | Scalar columns: `price_amount`/`price_currency`, `quantity_value`/`quantity_unit`, `lat`/`lng` | JSONB | Queryable, indexable (price sorting), typed via Zod on hydration. |
| 8 | Client singleton | Module-level `const db = drizzle(env.DATABASE_URL)` in `src/db/index.ts` | Per-request factory | neon-http is stateless; singleton is safe in RSC. |
| 9 | Per-request dedup | Wrap hot lib getters with `import { cache } from 'react'` | No cache, Next `unstable_cache` | React `cache()` memoizes within a single render tree — correct for `getBrand(id)` hit multiple times per page. `unstable_cache` is cross-request; we don't want stale data yet. |
| 10 | Env validation | `src/env.ts` with Zod, imported by `src/db/index.ts` and `drizzle.config.ts` | `process.env` bare | Fail-fast at boot with a clear error; Vercel build fails immediately if `DATABASE_URL` missing. |
| 11 | Migration workflow | `drizzle-kit generate` commits SQL under `drizzle/`; `drizzle-kit migrate` at deploy | `push` only, runtime auto-migrate | Reviewable diffs, reversible, standard. `push` stays allowed for local dev iterations. |
| 12 | Seed | `tsx src/db/seed.ts`, idempotent via `INSERT ... ON CONFLICT DO UPDATE` per table, run after migrate | Raw SQL dump | Reads existing `src/data/*` verbatim, one-time-only once `src/data/*` deleted (final commit). |
| 13 | Tests that imported `@/data` | Vitest `vi.mock('@/db', ...)` returning fixture objects; hoist fixtures to `src/test/fixtures/*.ts` derived from current `src/data/*` snapshots | Real test DB (Testcontainers), integration only | Unit layer stays fast/offline; fixtures are the pre-delete snapshot of `src/data/*`. |

## Data Flow

```
RSC page ──► lib getter (async, cache()) ──► db (neon-http) ──► Neon
    │                                               │
    └──── hydrates typed domain object ◄── Zod/schema inference
```

Build time (`generateStaticParams`, `sitemap.ts`): same path, executed once per build with Vercel env `DATABASE_URL`.

## Schema (Drizzle)

```
brands(id pk, slug uniq, name, logo_url, logo_alt, origin_country nullable, website nullable)
categories(id pk, slug uniq, name, parent_id fk→categories.id null, "order" int)
products(id pk, slug uniq, name, brand_id fk→brands.id, description, short_description null,
         species text[], tags text[], target_size text[] null, life_stage text null,
         ingredients null, nutritional_analysis jsonb null, featured bool default false)
product_categories(product_id fk, category_id fk, pk(product_id, category_id))  -- idx(category_id)
product_images(id pk, product_id fk, url, alt, sort_order int)                  -- idx(product_id, sort_order)
product_variants(id pk, product_id fk, sku uniq, name,
                 quantity_value numeric, quantity_unit text,
                 price_amount int, price_currency text,
                 compare_at_amount int null, compare_at_currency text null,
                 barcode null)                                                   -- idx(product_id)
stores(id pk, slug uniq, name, address, commune, phone,
       lat numeric, lng numeric, schedule jsonb, services text[], reference null)
stock_levels(variant_id fk, store_id fk, status text, pk(variant_id, store_id))  -- idx(store_id)
```

`status` kept as `text` with Zod enum guard on read (explicit choice: no PG enum; see decision #2).

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `drizzle.config.ts` | Create | drizzle-kit config (dialect pg, schema `./src/db/schema.ts`, out `./drizzle`) |
| `src/env.ts` | Create | Zod-validated env (`DATABASE_URL`) |
| `src/db/schema.ts` | Create | All tables + relations |
| `src/db/index.ts` | Create | `export const db = drizzle(env.DATABASE_URL)` singleton |
| `src/db/seed.ts` | Create | Idempotent upsert from `src/data/*`; cross-joins stock |
| `drizzle/*` | Create | Generated migration SQL |
| `.env.local.example` | Create | Documents `DATABASE_URL` |
| `package.json` | Modify | deps, scripts: `db:generate`, `db:migrate`, `db:push`, `db:seed`, `db:studio` |
| `src/lib/catalog.ts` | Modify | All getters async, use `db`, wrap hot ones with `cache()`; add `getAllProductSlugs()` |
| `src/lib/stores.ts` | Modify | async; add `getAllStores()` |
| `src/lib/stock.ts` | Modify | async; query `stock_levels` |
| `src/app/producto/[slug]/page.tsx` | Modify | `generateStaticParams` awaits `getAllProductSlugs()` |
| `src/app/sitemap.ts` | Modify | await `getAllProductSlugs()` |
| `src/app/sucursales/page.tsx` | Modify | await `getAllStores()` |
| All RSC callers of lib getters | Modify | add `await` |
| `src/test/fixtures/*.ts` | Create | snapshot of `src/data/*` for test mocks |
| `src/lib/*.test.ts`, `src/app/**/*.test.*` | Modify | mock `@/db` via fixtures; async assertions |
| `src/data/*` | Delete | LAST commit of slice |
| `src/types/*` | Keep | Domain types stay; schema infers aligned shapes |

## Interfaces

```ts
// src/env.ts
export const env = envSchema.parse(process.env); // { DATABASE_URL: string }

// src/db/index.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { env } from "@/env";
export const db = drizzle(neon(env.DATABASE_URL), { schema });

// src/lib/catalog.ts (pattern)
import { cache } from "react";
export const getBrand = cache(async (id: string): Promise<Brand | undefined> => { ... });
export const getAllProductSlugs = cache(async (): Promise<string[]> => { ... });
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit (lib) | getters, query, sort, filter | `vi.mock('@/db', () => ({ db: fakeDbFromFixtures }))`; fixtures live in `src/test/fixtures/` |
| Unit (components) | stock-list, store-map | mock lib helpers directly (already the pattern) |
| Build smoke | `next build` succeeds with real Neon | manual verification in slice PR; not in CI yet |
| Seed | idempotency | run twice locally, assert row counts stable |

No Testcontainers / real DB in CI this slice — explicit out-of-scope.

## Migration / Rollout

1. Add deps, write schema + env + client.
2. `drizzle-kit generate` → commit SQL.
3. `drizzle-kit migrate` against Neon.
4. Snapshot `src/data/*` → `src/test/fixtures/*`.
5. Write + run seed.
6. Convert lib → async; fix 4 leaks; propagate `await`.
7. Update tests (mock `@/db`).
8. Set `DATABASE_URL` in Vercel (Preview + Production).
9. Final commit: delete `src/data/*`.

Rollback = revert slice branch; last commit preserves single-revert of data deletion.

## Open Questions

- [ ] Do we keep `numeric` vs `integer` for `price_amount`? Current Money uses integer cents → `integer` wins (locked).
- [ ] Should `db:migrate` run in Vercel build step or as a separate deploy hook? Proposal: local/manual this slice; automate in a later infra slice.
