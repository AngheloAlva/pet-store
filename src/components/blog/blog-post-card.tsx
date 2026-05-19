import Image from "next/image";
import Link from "next/link";
import type { BlogPostRow } from "@/lib/blog";

interface BlogPostCardProps {
  post: BlogPostRow;
}

const CATEGORY_LABELS: Record<string, string> = {
  cuidados: "Cuidados",
  alimentacion: "Alimentación",
  salud: "Salud",
  novedades: "Novedades",
};

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  const categoryLabel = CATEGORY_LABELS[post.category] ?? post.category;

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md">
        {/* Hero image */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          {post.heroImageUrl ? (
            <Image
              src={post.heroImageUrl}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-sm">
              Sin imagen
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-2 p-4">
          {/* Category badge */}
          <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {categoryLabel}
          </span>

          {/* Title */}
          <h2 className="text-base font-semibold leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h2>

          {/* Excerpt */}
          <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>

          {/* Meta */}
          {post.publishedAt && (
            <time
              dateTime={post.publishedAt.toISOString()}
              className="mt-auto text-xs text-muted-foreground"
            >
              {formatDate(post.publishedAt)}
            </time>
          )}
        </div>
      </article>
    </Link>
  );
}
