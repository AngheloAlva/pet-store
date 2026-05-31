/**
 * GET /api/dte/libro-ventas?period=YYYY-MM
 * Returns Libro de Ventas as CSV attachment for admin use.
 *
 * CRITICAL (spec L-3): ONLY boleta(39)/factura(33) included.
 * NC/ND are adjustment documents and EXCLUDED from Libro de Ventas.
 *
 * Spec: L-1, L-2, L-3
 * F3.6 Slice E — T-42
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { getLibroVentasWithDb } from "@/app/actions/cuenta/documentos";

// CSV column headers — SII format (spec L-1-b)
const CSV_HEADERS = ["folio", "tipo", "fecha", "rutReceptor", "razonSocial", "neto", "iva", "total"];

function rowToCsv(row: Record<string, unknown>): string {
  return CSV_HEADERS.map((col) => {
    const val = row[col] ?? "";
    const str = String(val);
    // Escape strings with commas or quotes
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }).join(",");
}

export async function GET(req: NextRequest) {
  // Admin guard
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (user.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Parse period param
  const period = req.nextUrl.searchParams.get("period");
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return new NextResponse("Missing or invalid period (expected YYYY-MM)", {
      status: 400,
    });
  }

  const data = await getLibroVentasWithDb(db, period);

  // Build CSV
  const lines: string[] = [
    CSV_HEADERS.join(","),
    ...data.rows.map((row) => rowToCsv(row as unknown as Record<string, unknown>)),
    // Totals summary row
    `TOTALES,,,,,${ data.totals.totalNeto },${ data.totals.totalIva },${ data.totals.totalAmount }`,
  ];
  const csv = lines.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="libro-ventas-${period}.csv"`,
    },
  });
}
