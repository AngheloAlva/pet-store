import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { CatalogGrid } from "@/components/catalog/catalog-grid";
import { CatalogPagination } from "@/components/catalog/catalog-pagination";
import { CatalogToolbar } from "@/components/catalog/catalog-toolbar";
import {
  getAllBrands,
  getCategoryTree,
  getSpeciesInUse,
  queryProducts,
} from "@/lib/catalog";
import {
  parseCatalogQuery,
  type RawSearchParams,
} from "@/lib/url-params";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Explora alimentos, accesorios, farmacia y productos para tu mascota. Filtra por especie, marca y categoría.",
  alternates: { canonical: "/catalogo" },
};

type Props = {
  searchParams: Promise<RawSearchParams>;
};

export default async function CatalogoPage({ searchParams }: Props) {
  const raw = await searchParams;
  const query = parseCatalogQuery(raw);
  const result = queryProducts(query);

  const brands = getAllBrands();
  const categoryTree = getCategoryTree();
  const speciesInUse = getSpeciesInUse();

  return (
    <Container className="py-8 md:py-12">
      <header className="mb-6 md:mb-10">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Catálogo
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Todo lo que tu mascota necesita, en un solo lugar.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-[260px_1fr]">
        <aside className="hidden md:block">
          <CatalogFilters
            brands={brands}
            categoryTree={categoryTree}
            speciesInUse={speciesInUse}
          />
        </aside>

        <section>
          <CatalogToolbar
            resultCount={result.total}
            orden={query.orden}
            brands={brands}
            categoryTree={categoryTree}
            speciesInUse={speciesInUse}
          />
          <CatalogGrid products={result.items} />
          <CatalogPagination
            page={result.page}
            pageCount={result.pageCount}
            query={query}
          />
        </section>
      </div>
    </Container>
  );
}
