/**
 * /admin/documentos/[id] — F3.6 Slice D (T-34)
 * RSC: DTE detail page with:
 *   - All DTE fields
 *   - Inline DteDocument preview
 *   - "Descargar" link to /api/dte/[id]/pdf (spec P-3-b)
 *   - "Anular" island (generates NC via createCreditNote)
 * Spec: A-3
 */
import { notFound } from "next/navigation";
import { db } from "@/db";
import { dteDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DteDocument } from "@/components/dte/dte-document";
import type { DteType } from "@/db/schema";
import type { DteReceiver, DTEItem } from "@/lib/dte/provider";
import { AnularClient } from "./anular-client";
import { DebitoClient } from "./debito-client";

// ---------------------------------------------------------------------------
// Type label map
// ---------------------------------------------------------------------------

const DTE_TYPE_LABEL: Record<string, string> = {
  boleta: "Boleta Electrónica",
  factura: "Factura Electrónica",
  nota_credito: "Nota de Crédito Electrónica",
  nota_debito: "Nota de Débito Electrónica",
  guia: "Guía de Despacho Electrónica",
};

const STATUS_COLORS: Record<string, string> = {
  emitido: "bg-green-100 text-green-700",
  anulado: "bg-red-100 text-red-700",
  por_emitir: "bg-yellow-100 text-yellow-700",
  rechazado: "bg-gray-100 text-gray-600",
};

// ---------------------------------------------------------------------------
// Next 16: params is a Promise
// ---------------------------------------------------------------------------

interface AdminDocumentoDetailPageProps {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminDocumentoDetailPage({
  params,
}: AdminDocumentoDetailPageProps) {
  const { id } = await params;

  const dte = await db.query.dteDocuments.findFirst({
    where: eq(dteDocuments.id, id),
  });

  if (!dte) notFound();

  // Build props for DteDocument preview
  const receiver: DteReceiver = {
    rut: dte.receiverRut ?? "66666666-6",
    name: dte.receiverName ?? "Consumidor Final",
    businessLine: dte.receiverBusinessLine ?? undefined,
    address: dte.receiverAddress ?? undefined,
  };

  const items: DTEItem[] = [
    {
      description: "Productos / Servicios",
      quantity: 1,
      unitPrice: dte.net ?? dte.total ?? 0,
      lineTotal: dte.total ?? 0,
      afecto: true,
    },
  ];

  const typeLabel = DTE_TYPE_LABEL[dte.type ?? ""] ?? dte.type ?? "DTE";
  const isAnulable =
    dte.status === "emitido" &&
    dte.type !== "nota_credito" &&
    dte.type !== "nota_debito";

  // ND can be issued for any emitido boleta/factura (not on NC/ND themselves)
  const isDebitIssuable =
    dte.status === "emitido" &&
    dte.type !== "nota_credito" &&
    dte.type !== "nota_debito";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{typeLabel}</h1>
          <p className="text-sm text-gray-500 font-mono mt-1">
            Folio N° {dte.folio ?? "—"}
          </p>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            STATUS_COLORS[dte.status] ?? "bg-gray-100 text-gray-600"
          }`}
        >
          {dte.status}
        </span>
      </div>

      {/* DTE fields summary */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Document Details
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Type</span>
            <span className="font-medium text-gray-900">{dte.type ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Folio</span>
            <span className="font-medium text-gray-900 font-mono">
              {dte.folio ?? "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Document Code (SII)</span>
            <span className="font-medium text-gray-900">
              {dte.documentCode ?? "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Issued At</span>
            <span className="font-medium text-gray-900">
              {dte.issuedAt
                ? dte.issuedAt.toLocaleDateString("es-CL")
                : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Issuer RUT</span>
            <span className="font-medium text-gray-900 font-mono">
              {dte.issuerRut ?? "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Receiver RUT</span>
            <span className="font-medium text-gray-900 font-mono">
              {dte.receiverRut ?? "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Receiver Name</span>
            <span className="font-medium text-gray-900">
              {dte.receiverName ?? "—"}
            </span>
          </div>
          {dte.receiverBusinessLine && (
            <div className="flex justify-between">
              <span className="text-gray-500">Business Line</span>
              <span className="font-medium text-gray-900">
                {dte.receiverBusinessLine}
              </span>
            </div>
          )}
          {dte.referenceDteId && (
            <div className="flex justify-between col-span-2">
              <span className="text-gray-500">Reference DTE</span>
              <span className="font-medium text-gray-900 font-mono text-xs">
                {dte.referenceDteId}
              </span>
            </div>
          )}
        </div>

        {/* Tax amounts */}
        <div className="border-t border-gray-100 pt-3 mt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Neto</span>
            <span className="font-medium text-gray-900">
              ${(dte.net ?? 0).toLocaleString("es-CL")}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">IVA (19%)</span>
            <span className="font-medium text-gray-900">
              ${(dte.taxAmount ?? 0).toLocaleString("es-CL")}
            </span>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-gray-700">Total</span>
            <span className="text-gray-900">
              ${(dte.total ?? 0).toLocaleString("es-CL")}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {/* Descargar — links to PDF route (spec P-3-b) */}
        {dte.pdfUrl && (
          <a
            href={dte.pdfUrl}
            download
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
          >
            Descargar (PDF)
          </a>
        )}

        {/* Anular (spec A-3) — only for emitido, non-NC/ND */}
        {isAnulable && (
          <AnularClient dteId={dte.id} dteTotal={dte.total ?? 0} />
        )}

        {/* Nota de Débito (spec N-5, T-36-opt) — only for emitido boleta/factura */}
        {isDebitIssuable && (
          <DebitoClient dteId={dte.id} />
        )}
      </div>

      {/* DteDocument preview (spec A-3, P-2) */}
      {dte.folio && dte.issuedAt && dte.documentCode && dte.type && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              Document Preview
            </span>
          </div>
          <div className="overflow-auto max-h-[600px]">
            <DteDocument
              id={dte.id}
              folio={dte.folio}
              type={dte.type as DteType}
              documentCode={dte.documentCode}
              issuedAt={dte.issuedAt}
              issuerRut={dte.issuerRut ?? "76000000-0"}
              receiver={receiver}
              items={items}
              net={dte.net ?? 0}
              taxAmount={dte.taxAmount ?? 0}
              total={dte.total ?? 0}
              stamp={dte.stamp ?? ""}
            />
          </div>
        </div>
      )}
    </div>
  );
}
