"use client";

import { useId, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Brand, Category, ProductTag } from "@/types";
import type { Species } from "@/types/common";
import {
  PRICE_PRESETS,
  SPECIES_LABELS,
  TAG_FILTER_OPTIONS,
  type CategoryNode,
} from "@/lib/catalog-constants";

type CatalogFiltersProps = {
  brands: Brand[];
  categoryTree: CategoryNode[];
  speciesInUse: Species[];
};

const PRICE_ALL = "__all__";

function toggleValue(csv: string | null, value: string): string | null {
  const current = (csv ?? "").split(",").filter(Boolean);
  const idx = current.indexOf(value);
  if (idx >= 0) current.splice(idx, 1);
  else current.push(value);
  return current.length ? current.join(",") : null;
}

function writeParam(params: URLSearchParams, key: string, value: string | null) {
  if (value === null) params.delete(key);
  else params.set(key, value);
  params.delete("page");
}

export function CatalogFilters({
  brands,
  categoryTree,
  speciesInUse,
}: CatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const searchId = useId();
  const priceId = useId();

  const qParam = searchParams.get("q") ?? "";
  const [qLocal, setQLocal] = useState(qParam);
  const [lastSyncedQ, setLastSyncedQ] = useState(qParam);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (qParam !== lastSyncedQ) {
    setLastSyncedQ(qParam);
    setQLocal(qParam);
  }

  function pushParams(update: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams.toString());
    update(next);
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function onSearchChange(value: string) {
    setQLocal(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushParams((p) => writeParam(p, "q", value.trim() || null));
    }, 250);
  }

  function onToggle(key: "categoria" | "especie" | "marca" | "tag", value: string) {
    pushParams((p) => {
      const next = toggleValue(p.get(key), value);
      writeParam(p, key, next);
    });
  }

  function onPriceChange(value: string | null) {
    const v = value ?? PRICE_ALL;
    pushParams((p) => writeParam(p, "precio", v === PRICE_ALL ? null : v));
  }

  const categoriaSel = (searchParams.get("categoria") ?? "").split(",").filter(Boolean);
  const especieSel = (searchParams.get("especie") ?? "").split(",").filter(Boolean);
  const marcaSel = (searchParams.get("marca") ?? "").split(",").filter(Boolean);
  const tagSel = (searchParams.get("tag") ?? "").split(",").filter(Boolean);
  const precioSel = searchParams.get("precio") ?? PRICE_ALL;

  return (
    <div className="flex flex-col gap-6">
      <FilterGroup title="Buscar">
        <Label htmlFor={searchId} className="sr-only">
          Buscar productos
        </Label>
        <Input
          id={searchId}
          type="search"
          placeholder="Buscar por nombre o marca"
          value={qLocal}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar productos"
        />
      </FilterGroup>

      <Separator />

      <FilterGroup title="Mascota">
        <ul className="flex flex-col gap-2">
          {speciesInUse.map((s) => (
            <CheckboxRow
              key={s}
              label={SPECIES_LABELS[s]}
              checked={especieSel.includes(s)}
              onChange={() => onToggle("especie", s)}
            />
          ))}
        </ul>
      </FilterGroup>

      <Separator />

      <FilterGroup title="Categoría">
        <ul className="flex flex-col gap-2">
          {categoryTree.map(({ category, children }) => (
            <li key={category.id} className="flex flex-col gap-1.5">
              <CheckboxRow
                label={category.name}
                checked={categoriaSel.includes(category.slug)}
                onChange={() => onToggle("categoria", category.slug)}
                bold
              />
              {children.length > 0 && (
                <ul className="flex flex-col gap-1.5 pl-5">
                  {children.map((child) => (
                    <CheckboxRow
                      key={child.id}
                      label={child.name}
                      checked={categoriaSel.includes(child.slug)}
                      onChange={() => onToggle("categoria", child.slug)}
                    />
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </FilterGroup>

      <Separator />

      <FilterGroup title="Marca">
        <ul className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {brands.map((b) => (
            <CheckboxRow
              key={b.id}
              label={b.name}
              checked={marcaSel.includes(b.slug)}
              onChange={() => onToggle("marca", b.slug)}
            />
          ))}
        </ul>
      </FilterGroup>

      <Separator />

      <FilterGroup title="Etiqueta">
        <ul className="flex flex-col gap-2">
          {TAG_FILTER_OPTIONS.map((t) => (
            <CheckboxRow
              key={t.value}
              label={t.label}
              checked={tagSel.includes(t.value as ProductTag)}
              onChange={() => onToggle("tag", t.value)}
            />
          ))}
        </ul>
      </FilterGroup>

      <Separator />

      <FilterGroup title="Precio">
        <Label htmlFor={priceId} className="sr-only">
          Rango de precio
        </Label>
        <Select value={precioSel} onValueChange={onPriceChange}>
          <SelectTrigger id={priceId} className="w-full">
            <SelectValue placeholder="Cualquier precio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PRICE_ALL}>Cualquier precio</SelectItem>
            {PRICE_PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterGroup>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
  bold,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  bold?: boolean;
}) {
  const id = useId();
  return (
    <li className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={() => onChange()} />
      <Label
        htmlFor={id}
        className={bold ? "font-medium" : "font-normal text-muted-foreground"}
      >
        {label}
      </Label>
    </li>
  );
}

// Helper so we don't need to import Category at the consumer
export type CatalogFilterCategoryNode = { category: Category; children: Category[] };
