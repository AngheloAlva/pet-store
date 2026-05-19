import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getPostBySlug } from "@/lib/blog";
import { BlogPostBody } from "@/components/blog/blog-post-body";
import { RelatedProducts } from "@/components/blog/related-products";

type Props = {
  params: Promise<{ slug: string }>;
};

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPostBySlug(slug);
  if (!result) {
    return { title: "Artículo no encontrado" };
  }
  const { post } = result;
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.heroImageUrl ? [post.heroImageUrl] : [],
    },
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

export default async function BlogSlugPage({ params }: Props) {
  const { slug } = await params;
  const result = await getPostBySlug(slug);

  if (!result) {
    notFound();
  }

  const { post, relatedProducts } = result;
  const categoryLabel = CATEGORY_LABELS[post.category] ?? post.category;

  return (
    <main className="container mx-auto px-4 py-10 max-w-4xl">
      {/* Hero image */}
      {post.heroImageUrl && (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl mb-8">
          <Image
            src={post.heroImageUrl}
            alt={post.title}
            fill
            sizes="(max-width: 1024px) 100vw, 896px"
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-foreground transition-colors">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/blog" className="hover:text-foreground transition-colors">
              Blog
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/blog?category=${post.category}`}
              className="hover:text-foreground transition-colors"
            >
              {categoryLabel}
            </Link>
          </li>
        </ol>
      </nav>

      {/* Title */}
      <h1 className="text-3xl font-bold text-foreground mb-3">{post.title}</h1>

      {/* Meta line */}
      <p className="text-sm text-muted-foreground mb-4">
        {post.authorName} · {categoryLabel}
        {post.publishedAt && ` · ${formatDate(post.publishedAt)}`}
      </p>

      {/* Excerpt */}
      <p className="text-lg text-muted-foreground mb-8 leading-relaxed">{post.excerpt}</p>

      {/* Markdown body */}
      <BlogPostBody markdown={post.bodyMarkdown} />

      {/* Related products */}
      <RelatedProducts products={relatedProducts} />
    </main>
  );
}
