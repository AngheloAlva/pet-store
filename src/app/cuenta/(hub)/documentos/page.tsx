/**
 * /cuenta/documentos — F3.6 Slice E (T-39)
 * RSC page: lists the current user's boletas/facturas.
 * Auth guard handled by CuentaLayout (redirects to /login if no session).
 * Query scoped to user's orders via listMyDocuments (CL-1).
 * Spec: CL-1, CL-2
 */
import { listMyDocuments } from "@/app/actions/cuenta/documentos";

const DTE_TYPE_LABEL: Record<string, string> = {
  boleta: "Boleta",
  factura: "Factura",
  nota_credito: "Nota de Crédito",
  nota_debito: "Nota de Débito",
};

const STATUS_LABEL: Record<string, string> = {
  emitido: "Emitido",
  anulado: "Anulado",
  por_emitir: "Por Emitir",
  rechazado: "Rechazado",
};

export default async function DocumentosPage() {
  const documents = await listMyDocuments();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mis Documentos</h1>

      {documents.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">
            No tenés documentos tributarios asociados a tus pedidos.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="pb-2 font-medium">Tipo</th>
                <th className="pb-2 font-medium">Folio</th>
                <th className="pb-2 font-medium">Fecha</th>
                <th className="pb-2 font-medium">Total</th>
                <th className="pb-2 font-medium">Estado</th>
                <th className="pb-2 font-medium">Descargar</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 font-medium">
                    {DTE_TYPE_LABEL[doc.type ?? ""] ?? doc.type ?? "DTE"}
                  </td>
                  <td className="py-3 text-muted-foreground font-mono">
                    {doc.folio ?? "—"}
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {doc.issuedAt
                      ? new Date(doc.issuedAt).toLocaleDateString("es-CL")
                      : "—"}
                  </td>
                  <td className="py-3 font-medium">
                    {doc.total != null
                      ? `$${doc.total.toLocaleString("es-CL")}`
                      : "—"}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        doc.status === "emitido"
                          ? "bg-green-100 text-green-700"
                          : doc.status === "anulado"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {STATUS_LABEL[doc.status] ?? doc.status}
                    </span>
                  </td>
                  <td className="py-3">
                    {doc.pdfUrl ? (
                      <a
                        href={doc.pdfUrl}
                        download
                        className="text-sm text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline"
                      >
                        Descargar
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
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
