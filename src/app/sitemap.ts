import type { MetadataRoute } from "next";
import { getAllProductSlugs } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/seo";

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/catalogo", changeFrequency: "daily", priority: 0.9 },
  { path: "/sucursales", changeFrequency: "monthly", priority: 0.6 },
  { path: "/carrito", changeFrequency: "yearly", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries = STATIC_ROUTES.map((r) => ({
    url: absoluteUrl(r.path),
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const slugs = await getAllProductSlugs();
  const productEntries = slugs.map((slug) => ({
    url: absoluteUrl(`/producto/${slug}`),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticEntries, ...productEntries];
}
