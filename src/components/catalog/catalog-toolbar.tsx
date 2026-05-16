"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Funnel } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORT_OPTIONS } from "@/lib/catalog-constants";
import type { SortKey } from "@/lib/url-params";
import type { Brand, Category } from "@/types";
import type { Species } from "@/types/common";
import { CatalogFilters } from "./catalog-filters";
import type { CategoryNode } from "@/lib/catalog-constants";

type CatalogToolbarProps = {
  resultCount: number;
  orden: SortKey;
  brands: Brand[];
  categoryTree: CategoryNode[];
  speciesInUse: Species[];
};

export function CatalogToolbar({
  resultCount,
  orden,
  brands,
  categoryTree,
  speciesInUse,
}: CatalogToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function onOrdenChange(value: SortKey | null) {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === "relevancia") next.delete("orden");
    else next.set("orden", value);
    next.delete("page");
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  return (
    <div className="mb-6 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="md:hidden"
                aria-label="Abrir filtros"
              />
            }
          >
            <Funnel size={16} />
            Filtrar
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="p-6 pt-2">
              <CatalogFilters
                brands={brands}
                categoryTree={categoryTree}
                speciesInUse={speciesInUse}
              />
            </div>
          </SheetContent>
        </Sheet>
        <p
          className="text-sm text-muted-foreground tabular-nums"
          aria-live="polite"
        >
          {resultCount} {resultCount === 1 ? "producto" : "productos"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Label className="hidden text-sm text-muted-foreground sm:inline">
          Ordenar por
        </Label>
        <Select value={orden} onValueChange={onOrdenChange}>
          <SelectTrigger size="sm" aria-label="Ordenar resultados">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={className} {...props} />;
}

// Re-export type so page.tsx can stay lean
export type { Category };
