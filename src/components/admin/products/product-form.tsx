"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppForm } from "@/components/ui/tanstack-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { productFormSchema, type ZodFlatError } from "@/app/actions/admin/products.schema";
import type { ProductForEdit } from "@/lib/admin/products";
import type { Brand, Category, Store } from "@/types";
import { Trash } from "@phosphor-icons/react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Mode = "create" | "edit";

type ProductFormValues = {
  name: string;
  slug: string;
  brandId: string;
  description: string;
  shortDescription: string;
  species: string[];
  tags: string;
  targetSize: string;
  lifeStage: string;
  ingredients: string;
  featured: boolean;
  categoryIds: string[];
  images: { url: string; alt: string }[];
  variants: {
    id?: string;
    sku: string;
    name: string;
    quantityValue: number | string;
    quantityUnit: string;
    priceAmount: number | string;
    compareAtAmount: number | null;
    barcode: string;
    stockByStore: Record<string, string>;
    _showCompareAt?: boolean;
  }[];
};

type Props = {
  mode: Mode;
  brands: Brand[];
  categories: Category[];
  stores: Store[];
  initial?: ProductForEdit;
  action: (
    input: unknown,
  ) => Promise<{ ok: true; id?: string } | { ok: false; errors: ZodFlatError }>;
};

// ---------------------------------------------------------------------------
// Slug helper
// ---------------------------------------------------------------------------
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Empty variant helper
// ---------------------------------------------------------------------------
function emptyVariant(stores: Store[]) {
  const stockByStore: Record<string, string> = {};
  for (const store of stores) {
    stockByStore[store.id] = "in_stock";
  }
  return {
    sku: "",
    name: "",
    quantityValue: "" as number | string,
    quantityUnit: "kg",
    priceAmount: "" as number | string,
    compareAtAmount: null as number | null,
    barcode: "",
    stockByStore,
    _showCompareAt: false,
  };
}

const SPECIES_OPTIONS = [
  { value: "dog", label: "Perro" },
  { value: "cat", label: "Gato" },
  { value: "bird", label: "Ave" },
  { value: "fish", label: "Pez" },
  { value: "small_pet", label: "Pequeña mascota" },
  { value: "reptile", label: "Reptil" },
];

const QUANTITY_UNITS = ["kg", "g", "L", "ml", "unidad"];
const STOCK_STATUS_OPTIONS = [
  { value: "in_stock", label: "Disponible" },
  { value: "low", label: "Stock bajo" },
  { value: "out_of_stock", label: "Agotado" },
];

// ---------------------------------------------------------------------------
// ProductForm
// ---------------------------------------------------------------------------
export default function ProductForm({
  mode,
  brands,
  categories,
  stores,
  initial,
  action,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [slugManuallyOverridden, setSlugManuallyOverridden] = useState(
    mode === "edit",
  );

  // Default values
  const defaultValues: ProductFormValues = {
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    brandId: initial?.brandId ?? "",
    description: initial?.description ?? "",
    shortDescription: initial?.shortDescription ?? "",
    species: initial?.species ?? [],
    tags: (initial?.tags ?? []).join(", "),
    targetSize: (initial?.targetSize ?? []).join(", "),
    lifeStage: initial?.lifeStage ?? "",
    ingredients: initial?.ingredients ?? "",
    featured: initial?.featured ?? false,
    categoryIds: initial?.categoryIds ?? [],
    images:
      initial?.images.map((img) => ({ url: img.url, alt: img.alt })) ??
      [{ url: "", alt: "" }],
    variants:
      initial?.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        quantityValue: v.quantityValue,
        quantityUnit: v.quantityUnit,
        priceAmount: v.priceAmount,
        compareAtAmount: v.compareAtAmount,
        barcode: v.barcode ?? "",
        stockByStore: v.stockByStore,
        _showCompareAt: v.compareAtAmount != null,
      })) ?? [emptyVariant(stores)],
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: ({ value }) => {
        const result = productFormSchema.safeParse(value);
        if (result.success) return undefined;
        // Map Zod issues to { fields } shape — TanStack Form v1 distributes these to field errorMaps.
        // Convert Zod dot-notation paths (variants.0.sku) to TanStack bracket notation (variants[0].sku).
        const fields: Record<string, string> = {};
        for (const issue of result.error.issues) {
          if (!issue.path.length) continue;
          // Convert numeric path segments to bracket notation: ["variants", 0, "sku"] → "variants[0].sku"
          const path = issue.path.reduce<string>((acc, segment, i) => {
            if (typeof segment === "number") {
              return `${acc}[${segment}]`;
            }
            return i === 0 ? String(segment) : `${acc}.${segment}`;
          }, "");
          if (path && !fields[path]) {
            fields[path] = issue.message;
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { fields } as any;
      },
    },
  });

  // ---------------------------------------------------------------------------
  // Slug auto-sync
  // ---------------------------------------------------------------------------
  const handleNameChange = useCallback(
    (value: string, fieldChange: (v: string) => void) => {
      fieldChange(value);
      if (!slugManuallyOverridden) {
        form.setFieldValue("slug", slugify(value));
      }
    },
    [slugManuallyOverridden, form],
  );

  // ---------------------------------------------------------------------------
  // Submit handler
  // ---------------------------------------------------------------------------
  async function handleSubmit() {
    const values = form.state.values;

    // Build the payload
    const payload = {
      name: values.name,
      slug: values.slug,
      brandId: values.brandId,
      description: values.description,
      shortDescription: values.shortDescription || null,
      species: values.species,
      tags: values.tags
        ? values.tags
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [],
      targetSize: values.targetSize
        ? values.targetSize
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean)
        : null,
      lifeStage: values.lifeStage || null,
      ingredients: values.ingredients || null,
      featured: values.featured,
      categoryIds: values.categoryIds,
      images: values.images,
      variants: values.variants.map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        sku: v.sku,
        name: v.name,
        quantityValue: Number(v.quantityValue),
        quantityUnit: v.quantityUnit,
        priceAmount: Number(v.priceAmount),
        compareAtAmount: v.compareAtAmount,
        barcode: v.barcode || null,
        stockByStore: v.stockByStore,
      })),
    };

    startTransition(async () => {
      const result = await action(payload);

      if (!result.ok) {
        // Surface field errors via errorMap (TanStack Form v1 derives field.state.meta.errors from errorMap)
        const errors = result.errors;
        if (errors.fieldErrors) {
          for (const [field, messages] of Object.entries(errors.fieldErrors)) {
            if (messages && messages.length > 0) {
              form.setFieldMeta(field as never, (prev) => ({
                ...prev,
                errorMap: { ...(prev?.errorMap ?? {}), onServer: messages[0] },
                isTouched: true,
              }));
            }
          }
        }
        toast.error("Hubo errores en el formulario");
        return;
      }

      toast.success("Producto guardado");
      router.push("/admin/productos");
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit();
      }}
      className="space-y-8"
    >
      {/* Name */}
      <form.AppField name="name">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="name">Nombre *</FieldLabel>
            <Input
              id="name"
              placeholder="Nombre del producto"
              value={field.state.value}
              onChange={(e) => handleNameChange(e.target.value, field.handleChange)}
              onBlur={field.handleBlur}
            />
            {field.state.meta.errors.length > 0 && (
              <FieldError>{String(field.state.meta.errors[0])}</FieldError>
            )}
          </Field>
        )}
      </form.AppField>

      {/* Slug */}
      <form.AppField name="slug">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="slug">Slug *</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="slug"
                placeholder="slug-del-producto"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                readOnly={!slugManuallyOverridden}
                className={!slugManuallyOverridden ? "bg-muted cursor-default" : ""}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSlugManuallyOverridden((v) => !v)}
              >
                {slugManuallyOverridden ? "Auto" : "Editar manualmente"}
              </Button>
            </div>
            {field.state.meta.errors.length > 0 && (
              <FieldError>{String(field.state.meta.errors[0])}</FieldError>
            )}
          </Field>
        )}
      </form.AppField>

      {/* Brand */}
      <form.AppField name="brandId">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="brandId">Marca *</FieldLabel>
            <select
              id="brandId"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="">Seleccionar marca...</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            {field.state.meta.errors.length > 0 && (
              <FieldError>{String(field.state.meta.errors[0])}</FieldError>
            )}
          </Field>
        )}
      </form.AppField>

      {/* Description */}
      <form.AppField name="description">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="description">Descripción *</FieldLabel>
            <Textarea
              id="description"
              rows={4}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {field.state.meta.errors.length > 0 && (
              <FieldError>{String(field.state.meta.errors[0])}</FieldError>
            )}
          </Field>
        )}
      </form.AppField>

      {/* Short description */}
      <form.AppField name="shortDescription">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="shortDescription">Descripción breve</FieldLabel>
            <Textarea
              id="shortDescription"
              rows={2}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
          </Field>
        )}
      </form.AppField>

      {/* Species */}
      <form.AppField name="species">
        {(field) => (
          <fieldset>
            <legend className="text-sm font-medium mb-2">Especie(s) *</legend>
            <div className="flex flex-wrap gap-4">
              {SPECIES_OPTIONS.map((opt) => {
                const checked = field.state.value.includes(opt.value);
                return (
                  <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => {
                        if (c) {
                          field.handleChange([...field.state.value, opt.value]);
                        } else {
                          field.handleChange(
                            field.state.value.filter((v: string) => v !== opt.value),
                          );
                        }
                      }}
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
            {field.state.meta.errors.length > 0 && (
              <FieldError>{String(field.state.meta.errors[0])}</FieldError>
            )}
          </fieldset>
        )}
      </form.AppField>

      {/* Categories */}
      <form.AppField name="categoryIds">
        {(field) => (
          <fieldset>
            <legend className="text-sm font-medium mb-2">Categorías *</legend>
            <div className="flex flex-wrap gap-3">
              {categories.map((cat) => {
                const checked = field.state.value.includes(cat.id);
                return (
                  <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => {
                        if (c) {
                          field.handleChange([...field.state.value, cat.id]);
                        } else {
                          field.handleChange(
                            field.state.value.filter((v: string) => v !== cat.id),
                          );
                        }
                      }}
                    />
                    {cat.name}
                  </label>
                );
              })}
            </div>
            {field.state.meta.errors.length > 0 && (
              <FieldError>{String(field.state.meta.errors[0])}</FieldError>
            )}
          </fieldset>
        )}
      </form.AppField>

      {/* Featured */}
      <form.AppField name="featured">
        {(field) => (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              id="featured"
              checked={field.state.value}
              onCheckedChange={(c) => field.handleChange(!!c)}
            />
            <span>Producto destacado</span>
          </label>
        )}
      </form.AppField>

      {/* Tags */}
      <form.AppField name="tags">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="tags">Etiquetas</FieldLabel>
            <Input
              id="tags"
              placeholder="bestseller, sale, new (separadas por coma)"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            <FieldDescription>Separa las etiquetas con comas</FieldDescription>
          </Field>
        )}
      </form.AppField>

      {/* Life stage */}
      <form.AppField name="lifeStage">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="lifeStage">Etapa de vida</FieldLabel>
            <Input
              id="lifeStage"
              placeholder="adult, puppy, kitten..."
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
          </Field>
        )}
      </form.AppField>

      {/* Ingredients */}
      <form.AppField name="ingredients">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="ingredients">Ingredientes</FieldLabel>
            <Textarea
              id="ingredients"
              rows={3}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
          </Field>
        )}
      </form.AppField>

      {/* Images */}
      <section>
        <h3 className="text-sm font-medium mb-3">Imágenes *</h3>
        <form.AppField name="images" mode="array">
          {(field) => (
            <div className="space-y-3">
              {field.state.value.map((_img, idx) => (
                <div key={idx} className="flex gap-3 items-start rounded-lg border p-3">
                  <div className="flex-1 space-y-2">
                    <form.AppField name={`images[${idx}].url`}>
                      {(urlField) => (
                        <Field>
                          <FieldLabel htmlFor={`images[${idx}].url`}>URL</FieldLabel>
                          <Input
                            id={`images[${idx}].url`}
                            type="url"
                            placeholder="https://..."
                            value={urlField.state.value ?? ""}
                            onChange={(e) => urlField.handleChange(e.target.value)}
                            onBlur={urlField.handleBlur}
                          />
                          {urlField.state.meta.errors.length > 0 && (
                            <FieldError>{String(urlField.state.meta.errors[0])}</FieldError>
                          )}
                        </Field>
                      )}
                    </form.AppField>
                    <form.AppField name={`images[${idx}].alt`}>
                      {(altField) => (
                        <Field>
                          <FieldLabel htmlFor={`images[${idx}].alt`}>Alt</FieldLabel>
                          <Input
                            id={`images[${idx}].alt`}
                            placeholder="Descripción de la imagen"
                            value={altField.state.value ?? ""}
                            onChange={(e) => altField.handleChange(e.target.value)}
                            onBlur={altField.handleBlur}
                          />
                          {altField.state.meta.errors.length > 0 && (
                            <FieldError>{String(altField.state.meta.errors[0])}</FieldError>
                          )}
                        </Field>
                      )}
                    </form.AppField>
                  </div>
                  {/* Preview */}
                  {_img.url && (
                    // eslint-disable-next-line @next/next/no-img-element -- admin previews use arbitrary URLs; next/image needs remotePatterns whitelist
                    <img
                      src={_img.url}
                      alt={_img.alt || "Preview"}
                      loading="lazy"
                      className="h-20 w-20 rounded object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "";
                      }}
                    />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => field.removeValue(idx)}
                    disabled={field.state.value.length <= 1}
                    aria-label="Eliminar imagen"
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => field.pushValue({ url: "", alt: "" })}
              >
                Agregar imagen
              </Button>
              {field.state.meta.errors.length > 0 && (
                <FieldError>{String(field.state.meta.errors[0])}</FieldError>
              )}
            </div>
          )}
        </form.AppField>
      </section>

      {/* Variants */}
      <section>
        <h3 className="text-sm font-medium mb-3">Variantes *</h3>
        <form.AppField name="variants" mode="array">
          {(field) => (
            <div className="space-y-4">
              {field.state.value.map((variant, idx) => (
                <div key={idx} className="rounded-lg border p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Variante {idx + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => field.removeValue(idx)}
                      disabled={field.state.value.length <= 1}
                      aria-label="Eliminar variante"
                    >
                      <Trash size={16} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* SKU */}
                    <form.AppField name={`variants[${idx}].sku`}>
                      {(f) => (
                        <Field>
                          <FieldLabel htmlFor={`variants[${idx}].sku`}>SKU *</FieldLabel>
                          <Input
                            id={`variants[${idx}].sku`}
                            placeholder="SKU"
                            value={f.state.value ?? ""}
                            onChange={(e) => f.handleChange(e.target.value)}
                            onBlur={f.handleBlur}
                          />
                          {f.state.meta.errors.length > 0 && (
                            <FieldError>{String(f.state.meta.errors[0])}</FieldError>
                          )}
                        </Field>
                      )}
                    </form.AppField>

                    {/* Variant name */}
                    <form.AppField name={`variants[${idx}].name`}>
                      {(f) => (
                        <Field>
                          <FieldLabel htmlFor={`variants[${idx}].name`}>Nombre *</FieldLabel>
                          <Input
                            id={`variants[${idx}].name`}
                            placeholder="1 kg, 500 g..."
                            value={f.state.value ?? ""}
                            onChange={(e) => f.handleChange(e.target.value)}
                            onBlur={f.handleBlur}
                          />
                          {f.state.meta.errors.length > 0 && (
                            <FieldError>{String(f.state.meta.errors[0])}</FieldError>
                          )}
                        </Field>
                      )}
                    </form.AppField>

                    {/* Quantity value */}
                    <form.AppField name={`variants[${idx}].quantityValue`}>
                      {(f) => (
                        <Field>
                          <FieldLabel htmlFor={`variants[${idx}].quantityValue`}>
                            Cantidad *
                          </FieldLabel>
                          <Input
                            id={`variants[${idx}].quantityValue`}
                            type="number"
                            placeholder="1"
                            value={String(f.state.value ?? "")}
                            onChange={(e) => f.handleChange(Number(e.target.value))}
                            onBlur={f.handleBlur}
                          />
                        </Field>
                      )}
                    </form.AppField>

                    {/* Quantity unit */}
                    <form.AppField name={`variants[${idx}].quantityUnit`}>
                      {(f) => (
                        <Field>
                          <FieldLabel htmlFor={`variants[${idx}].quantityUnit`}>
                            Unidad *
                          </FieldLabel>
                          <select
                            id={`variants[${idx}].quantityUnit`}
                            value={f.state.value ?? "kg"}
                            onChange={(e) => f.handleChange(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                          >
                            {QUANTITY_UNITS.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </Field>
                      )}
                    </form.AppField>

                    {/* Price */}
                    <form.AppField name={`variants[${idx}].priceAmount`}>
                      {(f) => (
                        <Field>
                          <FieldLabel htmlFor={`variants[${idx}].priceAmount`}>
                            Precio CLP *
                          </FieldLabel>
                          <Input
                            id={`variants[${idx}].priceAmount`}
                            type="number"
                            placeholder="9990"
                            value={String(f.state.value ?? "")}
                            onChange={(e) => f.handleChange(Number(e.target.value))}
                            onBlur={f.handleBlur}
                          />
                          {f.state.meta.errors.length > 0 && (
                            <FieldError>{String(f.state.meta.errors[0])}</FieldError>
                          )}
                        </Field>
                      )}
                    </form.AppField>

                    {/* Barcode */}
                    <form.AppField name={`variants[${idx}].barcode`}>
                      {(f) => (
                        <Field>
                          <FieldLabel htmlFor={`variants[${idx}].barcode`}>Barcode</FieldLabel>
                          <Input
                            id={`variants[${idx}].barcode`}
                            placeholder="7800000000000"
                            value={String(f.state.value ?? "")}
                            onChange={(e) => f.handleChange(e.target.value)}
                            onBlur={f.handleBlur}
                          />
                        </Field>
                      )}
                    </form.AppField>
                  </div>

                  {/* Compare-at price (hidden until toggled) */}
                  {!variant._showCompareAt ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        field.state.value[idx]._showCompareAt = true;
                        field.handleChange([...field.state.value]);
                      }}
                    >
                      Agregar descuento
                    </Button>
                  ) : (
                    <div className="flex items-end gap-2">
                      <form.AppField name={`variants[${idx}].compareAtAmount`}>
                        {(f) => (
                          <Field>
                            <FieldLabel htmlFor={`variants[${idx}].compareAtAmount`}>
                              Precio de lista
                            </FieldLabel>
                            <Input
                              id={`variants[${idx}].compareAtAmount`}
                              type="number"
                              placeholder="19990"
                              value={f.state.value != null ? String(f.state.value) : ""}
                              onChange={(e) =>
                                f.handleChange(
                                  e.target.value ? Number(e.target.value) : null,
                                )
                              }
                              onBlur={f.handleBlur}
                            />
                            {f.state.meta.errors.length > 0 && (
                              <FieldError>{String(f.state.meta.errors[0])}</FieldError>
                            )}
                          </Field>
                        )}
                      </form.AppField>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updated = [...field.state.value];
                          updated[idx] = {
                            ...updated[idx],
                            compareAtAmount: null,
                            _showCompareAt: false,
                          };
                          field.handleChange(updated);
                        }}
                        aria-label="Quitar descuento"
                      >
                        ×
                      </Button>
                    </div>
                  )}

                  {/* Stock per store */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Stock por sucursal
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {stores.map((store) => (
                        <form.AppField
                          key={store.id}
                          name={`variants[${idx}].stockByStore.${store.id}`}
                        >
                          {(f) => (
                            <div className="flex flex-col gap-1">
                              <label
                                htmlFor={`variants[${idx}].stockByStore.${store.id}`}
                                className="text-xs"
                              >
                                {store.name}
                              </label>
                              <select
                                id={`variants[${idx}].stockByStore.${store.id}`}
                                value={String(f.state.value ?? "in_stock")}
                                onChange={(e) => f.handleChange(e.target.value)}
                                className="h-8 rounded border border-input bg-transparent px-2 text-xs"
                              >
                                {STOCK_STATUS_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </form.AppField>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => field.pushValue(emptyVariant(stores))}
              >
                Agregar variante
              </Button>

              {field.state.meta.errors.length > 0 && (
                <FieldError>{String(field.state.meta.errors[0])}</FieldError>
              )}
            </div>
          )}
        </form.AppField>
      </section>

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar producto"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/productos")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
