import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { ProductBreadcrumb } from "@/components/product/product-breadcrumb";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductInfoTabs } from "@/components/product/product-info-tabs";
import { ProductPurchasePanel } from "@/components/product/product-purchase-panel";
import { RelatedProducts } from "@/components/product/related-products";
import { getProductBySlug } from "@/lib/catalog";
import { products } from "@/data";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) {
    return { title: "Producto no encontrado" };
  }
  const description =
    product.shortDescription ?? product.description.slice(0, 160);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/producto/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      images: product.images.map((img) => ({
        url: img.url,
        alt: img.alt,
      })),
    },
  };
}

export default async function ProductoPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) {
    notFound();
  }

  return (
    <Container className="py-8 pb-24 md:py-12 md:pb-12">
      <ProductBreadcrumb product={product} />

      <div className="grid gap-10 md:grid-cols-2">
        <ProductGallery images={product.images} />
        <ProductPurchasePanel product={product} />
      </div>

      <div className="mt-12">
        <ProductInfoTabs product={product} />
      </div>

      <RelatedProducts product={product} />
    </Container>
  );
}
