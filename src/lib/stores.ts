/**
 * stores.ts — async lib layer (data still from src/data/* until Neon is provisioned).
 *
 * TODO(slice-8-follow-up): After running `pnpm db:seed`, replace the
 * Promise.resolve() wrappers below with actual Drizzle queries from `@/db`.
 */
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  FirstAid,
  Pill,
  Scissors,
  Storefront,
} from "@phosphor-icons/react/dist/ssr";
import { stores } from "@/data";
import type { Store, StoreService } from "@/types";
import { cache } from "react";

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
  return Promise.resolve(stores);
});

/** Returns a store by slug or undefined. */
export const getStoreBySlugAsync = cache(
  async (slug: string | undefined | null): Promise<Store | undefined> => {
    if (!slug) return undefined;
    return Promise.resolve(stores.find((s) => s.slug === slug));
  },
);

// ---------------------------------------------------------------------------
// Sync helpers (unchanged — kept for callers that are not async)
// ---------------------------------------------------------------------------

export function getStoreBySlug(
  slug: string | undefined | null,
): Store | undefined {
  if (!slug) return undefined;
  return stores.find((s) => s.slug === slug);
}

export function getStoresCommuneSummary(): string {
  return stores.map((s) => s.commune).join(", ");
}

export function getStoresByService(service: StoreService): Store[] {
  return stores.filter((s) => s.services.includes(service));
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
