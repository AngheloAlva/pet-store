import { loadCategoriesFlat } from "@/lib/admin/categories";
import { SortableCategoryList } from "@/components/admin/categories/sortable-category-list";

export default async function CategoriasPage() {
  const rows = await loadCategoriesFlat();

  // Parent options for the edit dialog select
  const parentOptions = rows
    .filter((r) => r.parentId == null)
    .map((r) => ({ id: r.id, name: r.name }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categorías</h1>
      </div>

      <SortableCategoryList rows={rows} parentOptions={parentOptions} />
    </div>
  );
}
