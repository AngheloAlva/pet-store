/**
 * GET /api/dte/[id]/pdf
 * Returns the DTE document as a standalone HTML attachment.
 * Spec: P-1, P-3
 *
 * The injectable getDtePdfWithDb function is exported for unit testing.
 */
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dteDocuments } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { DteDocument } from "@/components/dte/dte-document";
import type { DteReceiver, DTEItem } from "@/lib/dte/provider";
import type { SessionUser } from "@/types/session";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DbLike = typeof db;

// ---------------------------------------------------------------------------
// Core injectable function (testable without Next.js context)
// ---------------------------------------------------------------------------

export async function getDtePdfWithDb(
  database: DbLike,
  id: string,
  user: SessionUser | null
): Promise<Response> {
  // Auth guard: require authenticated user
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Fetch DTE row
  const dte = await database.query.dteDocuments.findFirst({
    where: eq(dteDocuments.id, id),
  });

  if (!dte) {
    return new Response("DTE not found", { status: 404 });
  }

  // Render DTE to static HTML string
  const receiver: DteReceiver = {
    rut: dte.receiverRut ?? "66666666-6",
    name: dte.receiverName ?? "Consumidor Final",
    businessLine: dte.receiverBusinessLine ?? undefined,
    address: dte.receiverAddress ?? undefined,
  };

  // Build items from stored data — at this point items are not individually stored;
  // we reconstruct a single summary line from the DTE totals for the PDF render.
  const items: DTEItem[] = [
    {
      description: "Productos / Servicios",
      quantity: 1,
      unitPrice: dte.net ?? dte.total ?? 0,
      lineTotal: dte.total ?? 0,
      afecto: true,
    },
  ];

  const html = renderToStaticMarkup(
    React.createElement(DteDocument, {
      id: dte.id,
      folio: dte.folio ?? 0,
      type: (dte.type ?? "boleta") as "boleta" | "factura" | "nota_credito" | "nota_debito" | "guia",
      documentCode: dte.documentCode ?? 39,
      issuedAt: dte.issuedAt ?? new Date(),
      issuerRut: dte.issuerRut ?? "76000000-0",
      receiver,
      items,
      net: dte.net ?? 0,
      taxAmount: dte.taxAmount ?? 0,
      total: dte.total ?? 0,
      stamp: dte.stamp ?? "",
    })
  );

  const typeSlug = dte.type ?? "dte";
  const folio = dte.folio ?? 0;
  const filename = `${typeSlug}-${folio}.html`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// ---------------------------------------------------------------------------
// Next.js route handler
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const user = await getCurrentUser();
  return getDtePdfWithDb(db, id, user);
}
