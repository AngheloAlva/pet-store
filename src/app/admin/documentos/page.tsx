/**
 * /admin/documentos — F3.6 Slice D (T-33)
 * RSC: server-driven DTE list via URL searchParams.
 * Filters: type, dateFrom/dateTo, receiverRut, folioFrom/folioTo.
 * Period totals (neto / IVA / total) shown as header summary.
 * Spec: A-1, A-2
 */
import Link from "next/link";
import { listDocumentsWithDb } from "@/app/actions/admin/documentos";
import { db } from "@/db";
import { DocumentosFiltrosClient } from "./documentos-filtros-client";

// ---------------------------------------------------------------------------
// Type label map
// ---------------------------------------------------------------------------

const DTE_TYPE_LABEL: Record<string, string> = {
  boleta: "Boleta",
  factura: "Factura",
  nota_credito: "NC",
  nota_debito: "ND",
  guia: "Guía",
};

const STATUS_COLORS: Record<string, string> = {
  emitido: "bg-green-100 text-green-700",
  anulado: "bg-red-100 text-red-700",
  por_emitir: "bg-yellow-100 text-yellow-700",
  rechazado: "bg-gray-100 text-gray-600",
};

// ---------------------------------------------------------------------------
// Next 16: searchParams is a Promise
// ---------------------------------------------------------------------------

type SearchParams = Promise<{
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  receiverRut?: string;
  folioFrom?: string;
  folioTo?: string;
}>;

interface AdminDocumentosPageProps {
  searchParams: SearchParams;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminDocumentosPage({
  searchParams,
}: AdminDocumentosPageProps) {
  const params = await searchParams;

  const folioFrom = params.folioFrom ? parseInt(params.folioFrom, 10) : undefined;
  const folioTo = params.folioTo ? parseInt(params.folioTo, 10) : undefined;

  const { documents, totals } = await listDocumentsWithDb(db, {
    type: params.type as never,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    receiverRut: params.receiverRut,
    folioFrom: Number.isNaN(folioFrom) ? undefined : folioFrom,
    folioTo: Number.isNaN(folioTo) ? undefined : folioTo,
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">DTE Documents</h1>
        <p className="text-sm text-gray-500 mt-1">
          All electronic tax documents issued by the system.
        </p>
      </div>

      {/* Filters island */}
      <DocumentosFiltrosClient
        initialType={params.type ?? ""}
        initialDateFrom={params.dateFrom ?? ""}
        initialDateTo={params.dateTo ?? ""}
        initialReceiverRut={params.receiverRut ?? ""}
        initialFolioFrom={params.folioFrom ?? ""}
        initialFolioTo={params.folioTo ?? ""}
      />

      {/* Period totals (spec A-2) */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Neto
          </div>
          <div className="text-xl font-bold text-gray-900 mt-1">
            ${totals.totalNet.toLocaleString("es-CL")}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            IVA
          </div>
          <div className="text-xl font-bold text-gray-900 mt-1">
            ${totals.totalTax.toLocaleString("es-CL")}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Total
          </div>
          <div className="text-xl font-bold text-gray-900 mt-1">
            ${totals.totalAmount.toLocaleString("es-CL")}
          </div>
        </div>
      </div>

      {/* Documents table */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
          No documents found matching the current filters.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Folio
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Issued At
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Receiver
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Total
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">
                    {DTE_TYPE_LABEL[doc.type ?? ""] ?? doc.type ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {doc.folio ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {doc.issuedAt
                      ? doc.issuedAt.toLocaleDateString("es-CL")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-xs">
                    <div>{doc.receiverRut ?? "—"}</div>
                    {doc.receiverName && (
                      <div className="text-gray-400">{doc.receiverName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {doc.total != null
                      ? `$${doc.total.toLocaleString("es-CL")}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_COLORS[doc.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/documentos/${doc.id}`}
                      className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
