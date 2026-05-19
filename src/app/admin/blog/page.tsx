import Link from "next/link";
import { listAllPosts } from "@/lib/admin/blog";
import { BLOG_CATEGORY, BLOG_STATUS } from "@/db/schema";

const CATEGORY_LABELS: Record<string, string> = {
  cuidados: "Cuidados",
  alimentacion: "Alimentación",
  salud: "Salud",
  novedades: "Novedades",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  archived: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

interface AdminBlogPageProps {
  searchParams: Promise<{ status?: string; category?: string }>;
}

export default async function AdminBlogPage({ searchParams }: AdminBlogPageProps) {
  const params = await searchParams;
  const status = BLOG_STATUS.includes(params.status as never) ? params.status : undefined;
  const category = BLOG_CATEGORY.includes(params.category as never)
    ? params.category
    : undefined;

  const posts = await listAllPosts({ status, category });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Blog</h1>
          <p className="text-sm text-muted-foreground">
            Administrá artículos, guías y contenido SEO.
          </p>
        </div>
        <Link
          href="/admin/blog/nuevo"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Nuevo artículo
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/blog"
          className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${!status && !category ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
        >
          Todos
        </Link>
        {BLOG_STATUS.map((s) => (
          <Link
            key={s}
            href={`/admin/blog?status=${s}${category ? `&category=${category}` : ""}`}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${status === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
          >
            {STATUS_LABELS[s] ?? s}
          </Link>
        ))}
      </div>

      {/* Posts table */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground">No hay artículos todavía.</p>
          <Link
            href="/admin/blog/nuevo"
            className="mt-4 text-sm text-primary hover:underline"
          >
            Crear el primero
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Título</th>
                <th className="text-left px-4 py-3 font-medium">Categoría</th>
                <th className="text-left px-4 py-3 font-medium">Estado</th>
                <th className="text-left px-4 py-3 font-medium">Autor</th>
                <th className="text-left px-4 py-3 font-medium">Publicado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium max-w-xs">
                    <span className="line-clamp-1">{post.title}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {CATEGORY_LABELS[post.category] ?? post.category}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[post.status] ?? ""}`}
                    >
                      {STATUS_LABELS[post.status] ?? post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{post.authorName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {post.publishedAt
                      ? new Intl.DateTimeFormat("es-CL", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }).format(post.publishedAt)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/blog/${post.id}/editar`}
                      className="text-xs text-primary hover:underline"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
