import type { ProductTag } from "@/types";
import type { Species } from "@/types/common";

export type SortKey =
  | "relevancia"
  | "precio-asc"
  | "precio-desc"
  | "nombre"
  | "nuevos";

const SORT_KEYS: readonly SortKey[] = [
  "relevancia",
  "precio-asc",
  "precio-desc",
  "nombre",
  "nuevos",
];

const VALID_SPECIES: readonly Species[] = [
  "dog",
  "cat",
  "bird",
  "small_pet",
  "fish",
  "reptile",
  "other",
];

const VALID_TAGS: readonly ProductTag[] = [
  "new",
  "sale",
  "bestseller",
  "exclusive",
  "natural",
  "grain-free",
];

export type CatalogQuery = {
  q: string;
  categorias: string[];
  especies: Species[];
  marcas: string[];
  tags: ProductTag[];
  precio: { min: number; max: number } | null;
  orden: SortKey;
  page: number;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

export function stripDiacritics(input: string): string {
  return input.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function firstValue(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function listValue(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  const raw = Array.isArray(v) ? v.join(",") : v;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseCatalogQuery(sp: RawSearchParams): CatalogQuery {
  const ordenRaw = firstValue(sp.orden);
  const orden: SortKey = SORT_KEYS.includes(ordenRaw as SortKey)
    ? (ordenRaw as SortKey)
    : "relevancia";

  const pageRaw = Number(firstValue(sp.page) ?? "1");
  const page =
    Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;

  let precio: { min: number; max: number } | null = null;
  const precioRaw = firstValue(sp.precio);
  if (precioRaw) {
    const [minStr, maxStr] = precioRaw.split("-");
    const min = Number(minStr);
    const max = Number(maxStr);
    if (Number.isFinite(min) && Number.isFinite(max) && min <= max) {
      precio = { min, max };
    }
  }

  const especies = listValue(sp.especie).filter((x): x is Species =>
    (VALID_SPECIES as readonly string[]).includes(x),
  );
  const tags = listValue(sp.tag).filter((x): x is ProductTag =>
    (VALID_TAGS as readonly string[]).includes(x),
  );

  return {
    q: firstValue(sp.q) ?? "",
    categorias: listValue(sp.categoria),
    especies,
    marcas: listValue(sp.marca),
    tags,
    precio,
    orden,
    page,
  };
}

export function serializeCatalogQuery(
  q: Partial<CatalogQuery>,
): URLSearchParams {
  const params = new URLSearchParams();
  if (q.q) params.set("q", q.q);
  if (q.categorias?.length) params.set("categoria", q.categorias.join(","));
  if (q.especies?.length) params.set("especie", q.especies.join(","));
  if (q.marcas?.length) params.set("marca", q.marcas.join(","));
  if (q.tags?.length) params.set("tag", q.tags.join(","));
  if (q.precio) params.set("precio", `${q.precio.min}-${q.precio.max}`);
  if (q.orden && q.orden !== "relevancia") params.set("orden", q.orden);
  if (q.page && q.page > 1) params.set("page", String(q.page));
  return params;
}
