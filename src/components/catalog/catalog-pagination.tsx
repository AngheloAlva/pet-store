import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { serializeCatalogQuery, type CatalogQuery } from "@/lib/url-params";

type Props = {
  page: number;
  pageCount: number;
  query: CatalogQuery;
};

function hrefFor(query: CatalogQuery, nextPage: number): string {
  const params = serializeCatalogQuery({ ...query, page: nextPage });
  const qs = params.toString();
  return qs ? `/catalogo?${qs}` : "/catalogo";
}

export function CatalogPagination({ page, pageCount, query }: Props) {
  if (pageCount <= 1) return null;
  if (page > pageCount) return null;

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <nav
      aria-label="Paginación"
      className="mt-10 flex flex-wrap items-center justify-center gap-1"
    >
      {page > 1 ? (
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={
            <Link
              href={hrefFor(query, page - 1)}
              aria-label="Página anterior"
            />
          }
        >
          <CaretLeft size={14} />
          Anterior
        </Button>
      ) : null}

      {pages.map((p) =>
        p === page ? (
          <Button
            key={p}
            size="sm"
            variant="default"
            aria-current="page"
            aria-label={`Página ${p}, actual`}
          >
            {p}
          </Button>
        ) : (
          <Button
            key={p}
            size="sm"
            variant="ghost"
            render={
              <Link href={hrefFor(query, p)} aria-label={`Página ${p}`} />
            }
          >
            {p}
          </Button>
        ),
      )}

      {page < pageCount ? (
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={
            <Link
              href={hrefFor(query, page + 1)}
              aria-label="Página siguiente"
            />
          }
        >
          Siguiente
          <CaretRight size={14} />
        </Button>
      ) : null}
    </nav>
  );
}
