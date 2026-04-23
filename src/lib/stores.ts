/**
 * stores.ts — lib layer backed by Drizzle (DB is source of truth).
 *
 * Async helpers use loadAllStores() from @/db/loaders.
 * Sync helpers use getCachedStores() (pre-populated by initSyncCache in root layout).
 * Public signatures are unchanged — no call-site modifications needed.
 */
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  FirstAid,
  Pill,
  Scissors,
  Storefront,
} from "@phosphor-icons/react/dist/ssr";
import type { Store, StoreService } from "@/types";
import { cache } from "react";
import { loadAllStores, getCachedStores } from "@/db/loaders";

export const DEFAULT_MAP_VIEWPORT: {
  center: [number, number];
  zoom: number;
} = {
  center: [-70.65, -33.45],
  zoom: 10,
};

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

export type StoreServiceMetaEntry = {
  label: string;
  Icon: PhosphorIcon;
};

export const STORE_SERVICE_META: Record<StoreService, StoreServiceMetaEntry> = {
  shop: { label: "Tienda", Icon: Storefront },
  vet: { label: "Veterinaria", Icon: FirstAid },
  grooming: { label: "Peluquería", Icon: Scissors },
  pharmacy: { label: "Farmacia", Icon: Pill },
};
