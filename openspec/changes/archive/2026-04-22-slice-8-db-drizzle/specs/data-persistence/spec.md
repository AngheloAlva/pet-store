# Data Persistence Specification

## Purpose

Defines the infrastructure contract for the Neon Postgres + Drizzle ORM layer: schema tables, migration workflow, DB client singleton, and seed script. All application data access flows through this layer; no module outside `src/db/` and `src/lib/` may import `src/data/*`.

## Requirements

### Requirement: Schema Definitions

The system MUST define Drizzle table schemas in `src/db/schema.ts` covering: `brands`, `categories`, `products`, `product_variants`, `product_images`, `product_categories` (junction), `stores`, and `stock_levels`.

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `brands` | `id`, `name`, `logo_url`, `logo_width`, `logo_height` | logo decomposed |
| `categories` | `id`, `name`, `slug`, `parent_id` | self-referencing FK |
| `products` | `id`, `slug`, `name`, `brand_id`, `description`, `species text[]`, `tags text[]`, `target_size text[]` | array cols |
| `product_variants` | `id`, `product_id`, `name`, `sku`, `price_amount`, `price_currency`, `quantity_value`, `quantity_unit` | composite decomposed |
| `product_images` | `id`, `product_id`, `url`, `alt`, `width`, `height` | FK products |
| `product_categories` | `product_id`, `category_id` | composite PK |
| `stores` | `id`, `slug`, `name`, `address`, `commune`, `phone`, `lat`, `lng`, `services text[]`, `schedule jsonb`, `reference` | coords decomposed |
| `stock_levels` | `variant_id`, `store_id`, `status` | composite PK; full cross-join |

#### Scenario: Schema compiles cleanly

- GIVEN `src/db/schema.ts` is imported by `src/db/index.ts`
- WHEN `pnpm typecheck` runs
- THEN zero TypeScript errors are reported

#### Scenario: All relations resolve

- GIVEN the Drizzle schema with all `relations()` definitions
- WHEN `drizzle-kit generate` runs
- THEN SQL migration files are generated without errors

### Requirement: Migration Workflow

The system MUST use `drizzle-kit` to manage schema migrations. Running `pnpm db:generate` MUST produce SQL migration files in `drizzle/`. Running `pnpm db:push` MUST apply the current schema to the connected Neon database.

#### Scenario: Generate produces SQL

- GIVEN a clean Neon database and `drizzle.config.ts` pointing to `src/db/schema.ts`
- WHEN `pnpm db:generate` runs
- THEN one or more `.sql` files appear in `drizzle/`

#### Scenario: Push applies schema

- GIVEN migration files in `drizzle/` and `DATABASE_URL` set
- WHEN `pnpm db:push` runs
- THEN all tables exist in Neon and `drizzle-kit` reports no pending migrations

### Requirement: DB Client Singleton

The system MUST export a single Drizzle client instance from `src/db/index.ts` using `drizzle-orm/neon-http` and `@neondatabase/serverless`. The module MUST throw a clear `Error` at import time if `DATABASE_URL` is not set.

#### Scenario: Missing DATABASE_URL fails fast

- GIVEN `DATABASE_URL` is undefined in the process environment
- WHEN any module imports `src/db/index.ts`
- THEN an `Error` with message containing `"DATABASE_URL"` is thrown before any query executes

#### Scenario: Singleton is reused across requests

- GIVEN `DATABASE_URL` is set
- WHEN two RSC modules both import `src/db/index.ts`
- THEN they receive the same module-cached instance (no duplicate connections)

### Requirement: Seed Script

The system MUST provide `src/db/seed.ts` that reads `src/data/*` arrays, inserts all rows into Postgres, and is idempotent (safe to re-run without duplicates). Stock seeding MUST expand the full `variant × store` cross-join then apply the 35 sparse exceptions.

#### Scenario: Seed inserts expected row counts

- GIVEN an empty Neon database
- WHEN `pnpm db:seed` runs
- THEN `stock_levels` contains exactly `(total variants) × (total stores)` rows

#### Scenario: Idempotent re-run

- GIVEN a fully seeded database
- WHEN `pnpm db:seed` runs a second time
- THEN row counts remain unchanged (upsert or truncate-then-insert strategy)

#### Scenario: Seed fails with clear error on DB unavailable

- GIVEN `DATABASE_URL` points to an unreachable host
- WHEN `pnpm db:seed` runs
- THEN the process exits with a non-zero code and a human-readable error message

### Requirement: Zero Direct Data Imports Outside DB Layer

No file under `src/app/**` or `src/lib/**` MAY import from `src/data/*`. All data access MUST go through `src/lib/{catalog,stores,stock}.ts`.

#### Scenario: Import boundary enforced

- GIVEN the full source tree after migration
- WHEN `rg "@/data" src/app src/lib` runs
- THEN the command returns no matches
