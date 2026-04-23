import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  FirstAid,
  Pill,
  Scissors,
  Storefront,
} from "@phosphor-icons/react";
import { stores } from "@/data";
import type { Store, StoreService } from "@/types";

export const DEFAULT_MAP_VIEWPORT: {
  center: [number, number];
  zoom: number;
} = {
  center: [-70.65, -33.45],
  zoom: 10,
};

export function getStoreBySlug(
  slug: string | undefined | null,
): Store | undefined {
  if (!slug) return undefined;
  return stores.find((s) => s.slug === slug);
}

export function getStoresCommuneSummary(): string {
  return stores.map((s) => s.commune).join(", ");
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
