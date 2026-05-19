"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { reorderCategories, deleteCategory } from "@/app/actions/admin/categories";
import { CategoryEditDialog } from "./category-edit-dialog";
import { DeleteCategoryDialog } from "./delete-category-dialog";
import type { CategoryRow } from "@/lib/admin/categories";
import { Pencil, Trash, DotsSixVertical } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Props = {
  rows: CategoryRow[];
  parentOptions: Array<{ id: string; name: string }>;
};

// ---------------------------------------------------------------------------
// SortableRow
// ---------------------------------------------------------------------------
function SortableRow({
  row,
  onEdit,
  onDelete,
}: {
  row: CategoryRow;
  onEdit: (row: CategoryRow) => void;
  onDelete: (row: CategoryRow) => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id: row.id });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm",
        row.parentId != null && "pl-8",
      )}
    >
      {/* Drag handle — must be Tab-focusable (S2, NF1, R6) */}
      <button
        type="button"
        aria-label="Reordenar"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <DotsSixVertical size={16} />
      </button>

      {/* Name */}
      <span className="flex-1 font-medium">{row.name}</span>

      {/* Slug */}
      <span className="text-muted-foreground text-xs">{row.slug}</span>

      {/* Species badge */}
      {row.species && (
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
          {row.species}
        </span>
      )}

      {/* Actions */}
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Editar ${row.name}`}
          onClick={() => onEdit(row)}
        >
          <Pencil size={14} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Eliminar ${row.name}`}
          onClick={() => onDelete(row)}
        >
          <Trash size={14} />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group component — isolated SortableContext per group (S34, R5)
// ---------------------------------------------------------------------------
function SortableGroup({
  groupRows,
  onEdit,
  onDelete,
}: {
  groupRows: CategoryRow[];
  onEdit: (row: CategoryRow) => void;
  onDelete: (row: CategoryRow) => void;
}) {
  return (
    <SortableContext
      items={groupRows.map((r) => r.id)}
      strategy={verticalListSortingStrategy}
    >
      {groupRows.map((row) => (
        <SortableRow key={row.id} row={row} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </SortableContext>
  );
}

// ---------------------------------------------------------------------------
// SortableCategoryList
// ---------------------------------------------------------------------------
export function SortableCategoryList({ rows, parentOptions }: Props) {
  const [items, setItems] = useState<CategoryRow[]>(rows);
  const [, startTransition] = useTransition();

  // Dialog state
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    initial?: CategoryRow;
  }>({ open: false, mode: "create" });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    row?: CategoryRow;
  }>({ open: false });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  );

  // Split into groups: parents and per-parent children
  const parents = items.filter((r) => r.parentId == null);
  const childrenByParent = new Map<string, CategoryRow[]>();
  for (const item of items) {
    if (item.parentId != null) {
      const list = childrenByParent.get(item.parentId) ?? [];
      list.push(item);
      childrenByParent.set(item.parentId, list);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeItem = items.find((r) => r.id === activeId);
    const overItem = items.find((r) => r.id === overId);

    if (!activeItem || !overItem) return;

    // Only allow reordering within the same group
    if (activeItem.parentId !== overItem.parentId) return;

    const groupParentId = activeItem.parentId;
    const groupItems =
      groupParentId == null
        ? parents
        : (childrenByParent.get(groupParentId) ?? []);

    const oldIndex = groupItems.findIndex((r) => r.id === activeId);
    const newIndex = groupItems.findIndex((r) => r.id === overId);

    if (oldIndex === -1 || newIndex === -1) return;

    const newGroupOrder = arrayMove(groupItems, oldIndex, newIndex);

    // Build the new full items array preserving other groups
    const otherItems = items.filter((r) => r.parentId !== groupParentId);
    const reorderedGroup = newGroupOrder.map((r, idx) => ({
      ...r,
      order: idx,
    }));

    const newItems = groupParentId == null
      ? [
          ...reorderedGroup,
          ...otherItems.filter((r) => r.parentId != null),
        ]
      : [
          ...otherItems.filter((r) => r.parentId == null),
          ...items.filter(
            (r) => r.parentId != null && r.parentId !== groupParentId,
          ),
          ...reorderedGroup,
        ];

    setItems(newItems);

    // Call server action optimistically
    startTransition(async () => {
      const orderedIds = newGroupOrder.map((r) => r.id);
      const result = await reorderCategories(orderedIds);
      if (!result.ok) {
        // Revert
        setItems(rows);
        toast.error("Error al reordenar categorías");
      }
    });
  }

  function handleEdit(row: CategoryRow) {
    setEditDialog({ open: true, mode: "edit", initial: row });
  }

  function handleDeleteClick(row: CategoryRow) {
    setDeleteDialog({ open: true, row });
  }

  async function handleDeleteConfirm() {
    if (!deleteDialog.row) return;
    const result = await deleteCategory(deleteDialog.row.id);
    if (!result.ok) {
      toast.error(result.errors.formErrors[0] ?? "Error al eliminar");
    } else {
      toast.success("Categoría eliminada");
    }
  }

  return (
    <div className="space-y-1">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {/* Parents group */}
        <SortableGroup
          groupRows={parents}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />

        {/* Children groups — one SortableContext per parent */}
        {Array.from(childrenByParent.entries()).map(([parentId, children]) => (
          <SortableGroup
            key={parentId}
            groupRows={children}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
          />
        ))}
      </DndContext>

      {/* Add button */}
      <div className="pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setEditDialog({ open: true, mode: "create", initial: undefined })
          }
        >
          Agregar categoría
        </Button>
      </div>

      {/* Edit/Create dialog */}
      <CategoryEditDialog
        mode={editDialog.mode}
        initial={editDialog.initial}
        parentOptions={parentOptions}
        open={editDialog.open}
        onOpenChange={(open) =>
          setEditDialog((prev) => ({ ...prev, open }))
        }
      />

      {/* Delete dialog */}
      <DeleteCategoryDialog
        categoryName={deleteDialog.row?.name}
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({ ...prev, open }))
        }
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
