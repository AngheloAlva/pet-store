import Link from "next/link";
import { loadAdminProductRows } from "@/lib/admin/products";
import { loadAllBrands, loadAllCategories } from "@/db/loaders";
import ProductListClient from "@/components/admin/products/product-list-client";
import { Button } from "@/components/ui/button";

type SearchParams = Promise<{
  q?: string;
  categoria?: string;
  brand?: string;
  featured?: string;
}>;

type Props = {
  searchParams: SearchParams;
};

export default async function AdminProductosPage({ searchParams }: Props) {
  const params = await searchParams;

  const [rows, brands, categories] = await Promise.all([
    loadAdminProductRows({
      q: params.q,
      categoria: params.categoria,
      brand: params.brand,
      featured: params.featured === "1" ? true : undefined,
    }),
    loadAllBrands(),
    loadAllCategories(),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Productos</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} producto{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button render={<Link href="/admin/productos/nuevo" />}>
          Agregar producto
        </Button>
      </div>

      {/* TODO: Add filter controls (search input, brand select, categoria select, featured toggle) */}

      <ProductListClient rows={rows} brands={brands} categories={categories} />
    </div>
  );
}
