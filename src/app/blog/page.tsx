import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedPosts } from "@/lib/blog";
import { BlogPostCard } from "@/components/blog/blog-post-card";
import { BLOG_CATEGORY, SPECIES } from "@/db/schema";

export const metadata: Metadata = {
  title: "Blog",
  description: "Guías de cuidado, tips y artículos escritos por especialistas.",
  alternates: { canonical: "/blog" },
};

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

interface BlogPageProps {
  searchParams: Promise<{ category?: string; species?: string }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;

  // Sanitize filters against allowed values
  const category = BLOG_CATEGORY.includes(params.category as never) ? params.category : undefined;
  const species = SPECIES.includes(params.species as never) ? params.species : undefined;

  const posts = await listPublishedPosts({ category, species });

  return (
    <main className="container mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Blog</h1>
        <p className="mt-2 text-muted-foreground">
          Guías de cuidado, tips y artículos escritos por especialistas para el día a día con tu
          mascota.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Filter sidebar */}
        <aside className="w-full lg:w-56 shrink-0">
          <div className="space-y-6">
            {/* Category filters */}
            <div>
              <h2 className="mb-2 text-sm font-semibold text-foreground">Categorías</h2>
              <ul className="space-y-1">
                <li>
                  <Link
                    href="/blog"
                    className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${!category ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                  >
                    Todas
                  </Link>
                </li>
                {BLOG_CATEGORY.map((cat) => (
                  <li key={cat}>
                    <Link
                      href={`/blog?category=${cat}${species ? `&species=${species}` : ""}`}
                      className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${category === cat ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                    >
                      {CATEGORY_LABELS[cat] ?? cat}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Species filters */}
            <div>
              <h2 className="mb-2 text-sm font-semibold text-foreground">Especie</h2>
              <ul className="space-y-1">
                <li>
                  <Link
                    href={`/blog${category ? `?category=${category}` : ""}`}
                    className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${!species ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                  >
                    Todas
                  </Link>
                </li>
                {SPECIES.map((sp) => (
                  <li key={sp}>
                    <Link
                      href={`/blog?${category ? `category=${category}&` : ""}species=${sp}`}
                      className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${species === sp ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                    >
                      {SPECIES_LABELS[sp] ?? sp}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* Post grid */}
        <div className="flex-1">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-lg text-muted-foreground">No hay artículos disponibles.</p>
              {(category || species) && (
                <Link href="/blog" className="mt-4 text-sm text-primary hover:underline">
                  Ver todos los artículos
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
