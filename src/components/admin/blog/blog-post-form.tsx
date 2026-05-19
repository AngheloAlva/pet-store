"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BLOG_CATEGORY, SPECIES } from "@/db/schema";
import { slugify } from "@/lib/admin/slugify";
import { createBlogPost, updateBlogPost } from "@/app/actions/admin/blog";
import type { AdminBlogPostDetail } from "@/lib/admin/blog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ProductOption {
  id: string;
  name: string;
  category: string;
}

interface BlogPostFormProps {
  mode: "create" | "edit";
  post?: AdminBlogPostDetail;
  products: ProductOption[];
}

const CATEGORY_LABELS: Record<string, string> = {
  cuidados: "Cuidados",
  alimentacion: "Alimentación",
  salud: "Salud",
  novedades: "Novedades",
};

const SPECIES_LABELS: Record<string, string> = {
  dog: "Perros",
  cat: "Gatos",
  exotic: "Exóticos",
};

// ---------------------------------------------------------------------------
// BlogPostForm
// ---------------------------------------------------------------------------
export function BlogPostForm({ mode, post, products }: BlogPostFormProps) {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [bodyMarkdown, setBodyMarkdown] = useState(post?.bodyMarkdown ?? "");
  const [heroImageUrl, setHeroImageUrl] = useState(post?.heroImageUrl ?? "");
  const [category, setCategory] = useState(post?.category ?? BLOG_CATEGORY[0]);
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>(post?.species ?? []);
  const [tags, setTags] = useState(post?.tags?.join(", ") ?? "");
  const [selectedProducts, setSelectedProducts] = useState<string[]>(
    post?.relatedProductIds ?? [],
  );
  const [authorName, setAuthorName] = useState(post?.authorName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Slug auto-fill
  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched || slug === "") {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(value);
  }

  function toggleSpecies(sp: string) {
    setSelectedSpecies((prev) =>
      prev.includes(sp) ? prev.filter((s) => s !== sp) : [...prev, sp],
    );
  }

  function toggleProduct(id: string) {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function buildPayload(status?: string) {
    return {
      ...(mode === "edit" && post ? { id: post.id } : {}),
      slug,
      title,
      excerpt,
      bodyMarkdown,
      heroImageUrl: heroImageUrl || undefined,
      category,
      species: selectedSpecies,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      authorName,
      relatedProductIds: selectedProducts,
      ...(status ? { status } : {}),
    };
  }

  async function handleSubmit(status?: string) {
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload(status);
      const result =
        mode === "create"
          ? await createBlogPost(payload)
          : await updateBlogPost(payload);

      if (!result.ok) {
        const errs = result.errors;
        const firstError =
          errs.formErrors?.[0] ??
          Object.values(errs.fieldErrors ?? {}).flat()[0] ??
          "Error al guardar";
        setError(String(firstError));
      } else {
        router.push("/admin/blog");
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(mode === "create" ? "draft" : undefined);
      }}
      className="space-y-6"
    >
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Título *
        </label>
        <input
          id="title"
          name="title"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Cuidados esenciales para tu perro"
          required
        />
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <label htmlFor="slug" className="text-sm font-medium">
          Slug *
        </label>
        <input
          id="slug"
          name="slug"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          placeholder="cuidados-para-perros"
          required
        />
      </div>

      {/* Excerpt */}
      <div className="space-y-1.5">
        <label htmlFor="excerpt" className="text-sm font-medium">
          Extracto *
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Resumen del artículo (máx. 280 caracteres)"
          maxLength={280}
          required
        />
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <label htmlFor="category" className="text-sm font-medium">
          Categoría *
        </label>
        <select
          id="category"
          name="category"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {BLOG_CATEGORY.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat] ?? cat}
            </option>
          ))}
        </select>
      </div>

      {/* Species */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Especies</legend>
        <div className="flex flex-wrap gap-4">
          {SPECIES.map((sp) => (
            <label key={sp} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                name={`species-${sp}`}
                checked={selectedSpecies.includes(sp)}
                onChange={() => toggleSpecies(sp)}
                aria-label={SPECIES_LABELS[sp] ?? sp}
              />
              {SPECIES_LABELS[sp] ?? sp}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Hero Image URL */}
      <div className="space-y-1.5">
        <label htmlFor="heroImageUrl" className="text-sm font-medium">
          URL imagen destacada
        </label>
        <input
          id="heroImageUrl"
          name="heroImageUrl"
          type="url"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={heroImageUrl}
          onChange={(e) => setHeroImageUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      {/* Author */}
      <div className="space-y-1.5">
        <label htmlFor="authorName" className="text-sm font-medium">
          Autor *
        </label>
        <input
          id="authorName"
          name="authorName"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Dr. García"
          required
        />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <label htmlFor="tags" className="text-sm font-medium">
          Tags (separados por coma)
        </label>
        <input
          id="tags"
          name="tags"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="perros, nutrición, cuidados"
        />
      </div>

      {/* Body Markdown */}
      <div className="space-y-1.5">
        <label htmlFor="bodyMarkdown" className="text-sm font-medium">
          Contenido (Markdown) *
        </label>
        <textarea
          id="bodyMarkdown"
          name="bodyMarkdown"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono min-h-[400px]"
          value={bodyMarkdown}
          onChange={(e) => setBodyMarkdown(e.target.value)}
          placeholder="# Título del artículo&#10;&#10;Comienza a escribir aquí..."
          required
        />
      </div>

      {/* Related Products */}
      {products.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Productos relacionados</legend>
          <div className="max-h-48 overflow-y-auto space-y-1 rounded-md border border-input p-3">
            {products.map((product) => (
              <label key={product.id} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  name={`product-${product.id}`}
                  checked={selectedProducts.includes(product.id)}
                  onChange={() => toggleProduct(product.id)}
                />
                {product.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {mode === "create" ? (
          <>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-md bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80 disabled:opacity-50"
            >
              Guardar como borrador
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit("published")}
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Publicar
            </button>
          </>
        ) : (
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Guardar cambios
          </button>
        )}
      </div>
    </form>
  );
}
