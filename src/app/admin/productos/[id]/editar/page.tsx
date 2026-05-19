import { notFound } from "next/navigation";
import { loadProductForEdit, loadAllStores } from "@/lib/admin/products";
import { loadAllBrands, loadAllCategories } from "@/db/loaders";
import { updateProduct } from "@/app/actions/admin/products";
import ProductForm from "@/components/admin/products/product-form";

type Params = Promise<{ id: string }>;

type Props = {
  params: Params;
};

export default async function EditarProductoPage({ params }: Props) {
  const { id } = await params;

  const [product, brands, categories, stores] = await Promise.all([
    loadProductForEdit(id),
    loadAllBrands(),
    loadAllCategories(),
    loadAllStores(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar producto</h1>
        <p className="text-sm text-muted-foreground">{product.name}</p>
      </div>

      <ProductForm
        mode="edit"
        brands={brands}
        categories={categories}
        stores={stores}
        initial={product}
        action={updateProduct.bind(null, id)}
      />
    </div>
  );
}
