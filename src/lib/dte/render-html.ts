/**
 * renderDteHtml — Pure HTML string renderer for Chilean DTE documents.
 *
 * No React, no react-dom/server. Returns a complete, standalone HTML document
 * as a string. Used by GET /api/dte/[id]/pdf to avoid the Turbopack production
 * build restriction on react-dom/server imports in route handlers.
 *
 * The admin detail preview continues to use <DteDocument> (RSC) directly,
 * which is rendered normally by Next.js — no restriction applies there.
 *
 * Spec: P-2 (fallback), P-1, P-3
 */

import { escapeHtml } from "@/lib/notifications/escape";
import type { DteDocumentProps } from "@/components/dte/dte-document";
import type { DTEItem } from "@/lib/dte/provider";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DTE_TYPE_LABEL: Record<string, string> = {
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

function renderItemRow(item: DTEItem): string {
  return `
    <tr>
      <td>${escapeHtml(item.description)}</td>
      <td class="text-right">${item.quantity}</td>
      <td class="text-right">${formatCLP(item.unitPrice)}</td>
      <td class="text-right">${formatCLP(item.lineTotal)}</td>
    </tr>`;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function renderDteHtml(props: DteDocumentProps): string {
  const {
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
  } = props;

  const typeLabel = escapeHtml(DTE_TYPE_LABEL[type] ?? type);
  const itemRows = items.map(renderItemRow).join("");

  const businessLineRow = receiver.businessLine
    ? `<div class="dte-row">
        <span class="dte-label">Giro:</span>
        <span>${escapeHtml(receiver.businessLine)}</span>
      </div>`
    : "";

  const addressRow = receiver.address
    ? `<div class="dte-row">
        <span class="dte-label">Dirección:</span>
        <span>${escapeHtml(receiver.address)}</span>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${typeLabel} N&deg; ${folio}</title>
  <style>
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
  </style>
</head>
<body>
  <div class="dte-container">
    <!-- Header: Issuer + Folio Box -->
    <div class="dte-header">
      <div class="dte-issuer">
        <div class="dte-label">Emisor</div>
        <div data-testid="issuer-rut">${escapeHtml(issuerRut)}</div>
      </div>
      <div class="dte-folio-box">
        <div class="type-label">${typeLabel}</div>
        <div class="doc-code">C&oacute;digo SII: ${documentCode}</div>
        <div class="folio-number">N&deg; ${folio}</div>
        <div class="date-row">${formatDate(issuedAt)}</div>
      </div>
    </div>

    <!-- Receiver -->
    <div class="dte-section">
      <div class="dte-section-title">Receptor</div>
      <div class="dte-row">
        <span class="dte-label">RUT:</span>
        <span data-testid="receiver-rut">${escapeHtml(receiver.rut)}</span>
      </div>
      <div class="dte-row">
        <span class="dte-label">Raz&oacute;n Social:</span>
        <span data-testid="receiver-name">${escapeHtml(receiver.name)}</span>
      </div>
      ${businessLineRow}
      ${addressRow}
    </div>

    <!-- Items table -->
    <div class="dte-section">
      <div class="dte-section-title">Detalle</div>
      <table>
        <thead>
          <tr>
            <th>Descripci&oacute;n</th>
            <th class="text-right">Cantidad</th>
            <th class="text-right">Precio Unit.</th>
            <th class="text-right">Total L&iacute;nea</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <table class="totals-table">
      <tbody>
        <tr>
          <td class="totals-label">Neto:</td>
          <td class="totals-value" data-testid="net">$ ${formatCLP(net)}</td>
        </tr>
        <tr>
          <td class="totals-label">IVA (19%):</td>
          <td class="totals-value" data-testid="tax-amount">$ ${formatCLP(taxAmount)}</td>
        </tr>
        <tr class="totals-total">
          <td class="totals-label">Total:</td>
          <td class="totals-value" data-testid="total">$ ${formatCLP(total)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Stamp / Timbre -->
    <div class="stamp-section">
      <div class="stamp-label">Timbre Electr&oacute;nico SII</div>
      <div class="stamp-value" data-testid="stamp">${escapeHtml(stamp)}</div>
    </div>
  </div>
</body>
</html>`;
}
