/**
 * Pure constants exported from the stores lib.
 * Importable from both Server Components and Client Components.
 * No DB dependency — safe for client bundles.
 */
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  FirstAid,
  Pill,
  Scissors,
  Storefront,
} from "@phosphor-icons/react/dist/ssr";
import type { StoreService } from "@/types";

export const DEFAULT_MAP_VIEWPORT: {
  center: [number, number];
  zoom: number;
} = {
  center: [-70.65, -33.45],
  zoom: 10,
};

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
