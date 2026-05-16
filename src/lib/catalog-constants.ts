/**
 * Pure constants exported from the catalog lib.
 * Importable from both Server Components and Client Components.
 * No DB dependency — safe for client bundles.
 */
import type { ProductTag } from "@/types";
import type { Species } from "@/types/common";
import type { SortKey } from "@/lib/url-params";
import type { Category } from "@/types";

export const PAGE_SIZE = 12;

export const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "relevancia", label: "Relevancia" },
  { value: "precio-asc", label: "Menor precio" },
  { value: "precio-desc", label: "Mayor precio" },
  { value: "nombre", label: "Nombre (A–Z)" },
  { value: "nuevos", label: "Novedades" },
];

export const PRICE_PRESETS: ReadonlyArray<{
  value: string;
  label: string;
  range: [number, number];
}> = [
  { value: "0-10000", label: "Menos de $10.000", range: [0, 10000] },
  { value: "10000-30000", label: "$10.000 – $30.000", range: [10000, 30000] },
  { value: "30000-60000", label: "$30.000 – $60.000", range: [30000, 60000] },
  { value: "60000-999999999", label: "Más de $60.000", range: [60000, 999_999_999] },
];

export const TAG_FILTER_OPTIONS: ReadonlyArray<{
  value: ProductTag;
  label: string;
}> = [
  { value: "sale", label: "Oferta" },
  { value: "bestseller", label: "Más vendido" },
  { value: "new", label: "Nuevo" },
  { value: "natural", label: "Natural" },
  { value: "grain-free", label: "Sin grano" },
  { value: "exclusive", label: "Exclusivo" },
];

export const SPECIES_LABELS: Record<Species, string> = {
  dog: "Perros",
  cat: "Gatos",
  bird: "Aves",
  small_pet: "Pequeñas mascotas",
  fish: "Peces",
  reptile: "Reptiles",
  other: "Otros",
};

export type CategoryNode = {
  category: Category;
  children: Category[];
};
