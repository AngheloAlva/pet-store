/**
 * stores.ts — lib layer backed by Drizzle (DB is source of truth).
 *
 * Async helpers use loadAllStores() from @/db/loaders.
 * Sync helpers use getCachedStores() (pre-populated by initSyncCache in root layout).
 * Public signatures are unchanged — no call-site modifications needed.
 */
import type { Store, StoreService } from "@/types";
import { cache } from "react";
import { loadAllStores } from "@/db/loaders";
import { getCachedStores } from "@/db/sync-cache";

// Re-export pure constants + types so existing imports from "@/lib/stores" still work.
export {
  DEFAULT_MAP_VIEWPORT,
  STORE_SERVICE_META,
  type StoreServiceMetaEntry,
} from "@/lib/stores-constants";

// ---------------------------------------------------------------------------
// Async helpers (final API signatures)
// ---------------------------------------------------------------------------

/** Returns all stores. */
export const getAllStores = cache(async (): Promise<Store[]> => {
  return loadAllStores();
});

/** Returns a store by slug or undefined. */
export const getStoreBySlugAsync = cache(
  async (slug: string | undefined | null): Promise<Store | undefined> => {
    if (!slug) return undefined;
    const stores = await loadAllStores();
    return stores.find((s) => s.slug === slug);
  },
);

// ---------------------------------------------------------------------------
// Sync helpers (unchanged — backed by sync module-level cache)
// ---------------------------------------------------------------------------

export function getStoreBySlug(
  slug: string | undefined | null,
): Store | undefined {
  if (!slug) return undefined;
  return getCachedStores().find((s) => s.slug === slug);
}

export function getStoresCommuneSummary(): string {
  return getCachedStores().map((s) => s.commune).join(", ");
}

export function getStoresByService(service: StoreService): Store[] {
  return getCachedStores().filter((s) => s.services.includes(service));
}
