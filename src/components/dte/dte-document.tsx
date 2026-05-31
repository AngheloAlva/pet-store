/**
 * DteDocument — Pure RSC (no client hooks)
 * Renders a DTE as printable HTML with Chilean tax-document layout.
 * Shared by: admin detail preview (Slice D) and GET /api/dte/[id]/pdf (Slice C).
 * Spec: P-2
 */

import type { DteType } from "@/db/schema";
import type { DteReceiver, DTEItem } from "@/lib/dte/provider";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DteDocumentProps {
  id: string;
  folio: number;
  type: DteType;
  documentCode: number;
  issuedAt: Date;
  issuerRut: string;
  receiver: DteReceiver;
  items: DTEItem[];
  net: number;
  taxAmount: number;
  total: number;
  stamp: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DTE_TYPE_LABEL: Record<DteType, string> = {
  boleta: "Boleta Electrónica",
  factura: "Factura Electrónica",
  nota_credito: "Nota de Crédito Electrónica",
  nota_debito: "Nota de Débito Electrónica",
  guia: "Guía de Despacho Electrónica",
};

function formatCLP(amount: number): string {
  return amount.toLocaleString("es-CL");
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DteDocument({
  folio,
  type,
  documentCode,
  issuedAt,
  issuerRut,
  receiver,
  items,
  net,
  taxAmount,
  total,
  stamp,
}: DteDocumentProps) {
  const typeLabel = DTE_TYPE_LABEL[type] ?? type;

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>
          {typeLabel} N° {folio}
        </title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; margin: 0; padding: 24px; color: #111; }
              .dte-container { max-width: 680px; margin: 0 auto; border: 2px solid #1a1a1a; padding: 24px; }
              .dte-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
              .dte-issuer { flex: 1; }
              .dte-folio-box { border: 2px solid #c00; padding: 12px 16px; text-align: center; min-width: 180px; }
              .dte-folio-box .type-label { font-size: 13px; font-weight: bold; }
              .dte-folio-box .doc-code { font-size: 11px; color: #555; margin: 4px 0; }
              .dte-folio-box .folio-number { font-size: 20px; font-weight: bold; color: #c00; }
              .dte-section { margin-bottom: 16px; }
              .dte-section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #555; border-bottom: 1px solid #ddd; margin-bottom: 8px; padding-bottom: 2px; }
              .dte-row { display: flex; gap: 8px; margin-bottom: 4px; }
              .dte-label { font-weight: bold; min-width: 120px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
              thead th { background: #f0f0f0; border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
              tbody td { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; }
              .text-right { text-align: right; }
              .totals-table { width: 280px; margin-left: auto; border-collapse: collapse; }
              .totals-table td { padding: 4px 8px; }
              .totals-table .totals-label { font-weight: bold; }
              .totals-table .totals-value { text-align: right; }
              .totals-total { font-size: 14px; font-weight: bold; border-top: 2px solid #111; }
              .stamp-section { margin-top: 24px; border-top: 1px dashed #999; padding-top: 12px; }
              .stamp-label { font-size: 10px; color: #777; text-transform: uppercase; }
              .stamp-value { font-size: 10px; word-break: break-all; color: #333; font-family: monospace; }
              .date-row { font-size: 11px; color: #555; margin-top: 4px; }
            `,
          }}
        />
      </head>
      <body>
        <div className="dte-container">
          {/* Header: Issuer + Folio Box */}
          <div className="dte-header">
            <div className="dte-issuer">
              <div className="dte-label">Emisor</div>
              <div data-testid="issuer-rut">{issuerRut}</div>
            </div>
            <div className="dte-folio-box">
              <div className="type-label">{typeLabel}</div>
              <div className="doc-code">Código SII: {documentCode}</div>
              <div className="folio-number">N° {folio}</div>
              <div className="date-row">{formatDate(issuedAt)}</div>
            </div>
          </div>

          {/* Receiver */}
          <div className="dte-section">
            <div className="dte-section-title">Receptor</div>
            <div className="dte-row">
              <span className="dte-label">RUT:</span>
              <span data-testid="receiver-rut">{receiver.rut}</span>
            </div>
            <div className="dte-row">
              <span className="dte-label">Razón Social:</span>
              <span data-testid="receiver-name">{receiver.name}</span>
            </div>
            {receiver.businessLine && (
              <div className="dte-row">
                <span className="dte-label">Giro:</span>
                <span>{receiver.businessLine}</span>
              </div>
            )}
            {receiver.address && (
              <div className="dte-row">
                <span className="dte-label">Dirección:</span>
                <span>{receiver.address}</span>
              </div>
            )}
          </div>

          {/* Items table */}
          <div className="dte-section">
            <div className="dte-section-title">Detalle</div>
            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th className="text-right">Cantidad</th>
                  <th className="text-right">Precio Unit.</th>
                  <th className="text-right">Total Línea</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.description}</td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-right">{formatCLP(item.unitPrice)}</td>
                    <td className="text-right">{formatCLP(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <table className="totals-table">
            <tbody>
              <tr>
                <td className="totals-label">Neto:</td>
                <td className="totals-value" data-testid="net">
                  $ {formatCLP(net)}
                </td>
              </tr>
              <tr>
                <td className="totals-label">IVA (19%):</td>
                <td className="totals-value" data-testid="tax-amount">
                  $ {formatCLP(taxAmount)}
                </td>
              </tr>
              <tr className="totals-total">
                <td className="totals-label">Total:</td>
                <td className="totals-value" data-testid="total">
                  $ {formatCLP(total)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Stamp / Timbre */}
          <div className="stamp-section">
            <div className="stamp-label">Timbre Electrónico SII</div>
            <div className="stamp-value" data-testid="stamp">
              {stamp}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
