"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Star } from "@phosphor-icons/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteProductDialog } from "./delete-product-dialog";
import { bulkDeleteProducts, bulkToggleFeatured, deleteProduct } from "@/app/actions/admin/products";
import type { AdminProductRow } from "@/lib/admin/products";
import type { Brand, Category } from "@/types";

type Props = {
  rows: AdminProductRow[];
  brands: Brand[];
  categories: Category[];
};

export default function ProductListClient({ rows }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const singleDeleteRow = rows.find((r) => r.id === singleDeleteId);

  // ---------------------------------------------------------------------------
  // Selection helpers
  // ---------------------------------------------------------------------------
  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  }

  // ---------------------------------------------------------------------------
  // Bulk featured toggle: majority-state inverse
  // ---------------------------------------------------------------------------
  function handleBulkToggleFeatured() {
    const selectedRows = rows.filter((r) => selected.has(r.id));
    const featuredCount = selectedRows.filter((r) => r.featured).length;
    const nextFeatured = featuredCount < selectedRows.length / 2;
    startTransition(async () => {
      await bulkToggleFeatured(Array.from(selected), nextFeatured);
    });
  }

  // ---------------------------------------------------------------------------
  // Bulk delete confirm
  // ---------------------------------------------------------------------------
  async function handleBulkDeleteConfirm() {
    await bulkDeleteProducts(Array.from(selected));
    setSelected(new Set());
  }

  // ---------------------------------------------------------------------------
  // Single delete confirm
  // ---------------------------------------------------------------------------
  async function handleSingleDeleteConfirm() {
    if (singleDeleteId) {
      await deleteProduct(singleDeleteId);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(singleDeleteId);
        return next;
      });
    }
    setSingleDeleteId(null);
  }

  // ---------------------------------------------------------------------------
  // Format price
  // ---------------------------------------------------------------------------
  function formatCLP(amount: number | null): string {
    if (amount == null) return "—";
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  return (
    <div className="space-y-4">
      {/* Bulk action toolbar */}
      {selected.size > 0 && (
        <div
          role="toolbar"
          aria-label={`Acciones para ${selected.size} seleccionados`}
          className="sticky top-0 z-10 flex items-center gap-3 rounded-lg border bg-background/95 px-4 py-2 shadow-sm backdrop-blur"
        >
          <span className="text-sm font-medium">
            {selected.size} seleccionados
          </span>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setBulkDeleteOpen(true)}
          >
            Eliminar ({selected.size})
          </Button>
          <Button size="sm" variant="outline" onClick={handleBulkToggleFeatured}>
            Destacar / Quitar destaque
          </Button>
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <Checkbox
                checked={selected.size === rows.length && rows.length > 0}
                onCheckedChange={toggleAll}
                aria-label="Seleccionar todos"
              />
            </TableHead>
            <TableHead>Imagen</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Marca</TableHead>
            <TableHead>Categorías</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Destacado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Checkbox
                  checked={selected.has(row.id)}
                  onCheckedChange={() => toggleRow(row.id)}
                  aria-label={`Seleccionar ${row.name}`}
                />
              </TableCell>
              <TableCell>
                {row.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin previews use arbitrary URLs; next/image needs remotePatterns whitelist
                  <img
                    src={row.thumbnailUrl}
                    alt={row.name}
                    loading="lazy"
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-muted" />
                )}
              </TableCell>
              <TableCell>
                <Link
                  href={`/admin/productos/${row.id}/editar`}
                  className="font-medium hover:underline"
                >
                  {row.name}
                </Link>
              </TableCell>
              <TableCell>{row.brandName}</TableCell>
              <TableCell>{row.categoryNames.join(", ")}</TableCell>
              <TableCell>{formatCLP(row.minPrice)}</TableCell>
              <TableCell>
                <span className="text-xs">
                  {row.stockSummary.inStock > 0 && (
                    <span className="text-green-600">{row.stockSummary.inStock} disponibles</span>
                  )}
                  {row.stockSummary.low > 0 && (
                    <span className="text-yellow-600"> · {row.stockSummary.low} bajos</span>
                  )}
                  {row.stockSummary.out > 0 && (
                    <span className="text-red-600"> · {row.stockSummary.out} agotados</span>
                  )}
                </span>
              </TableCell>
              <TableCell>
                {row.featured && (
                  <span title="Destacado" aria-label="Destacado">
                    <Star size={16} weight="fill" className="text-yellow-500" />
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setSingleDeleteId(row.id)}
                >
                  Eliminar
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                No hay productos.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Bulk delete dialog */}
      <DeleteProductDialog
        productCount={selected.size}
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={handleBulkDeleteConfirm}
      />

      {/* Single delete dialog */}
      <DeleteProductDialog
        productName={singleDeleteRow?.name}
        open={singleDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setSingleDeleteId(null);
        }}
        onConfirm={handleSingleDeleteConfirm}
      />
    </div>
  );
}
