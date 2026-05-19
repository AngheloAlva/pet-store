import { loadAllBrands, loadAllCategories, loadAllStores } from "@/db/loaders";
import { createProduct } from "@/app/actions/admin/products";
import ProductForm from "@/components/admin/products/product-form";

export default async function NuevoProductoPage() {
  const [brands, categories, stores] = await Promise.all([
    loadAllBrands(),
    loadAllCategories(),
    loadAllStores(),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo producto</h1>
        <p className="text-sm text-muted-foreground">
          Completa los campos para crear un nuevo producto.
        </p>
      </div>

      <ProductForm
        mode="create"
        brands={brands}
        categories={categories}
        stores={stores}
        action={createProduct}
      />
    </div>
  );
}
