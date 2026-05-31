/**
 * Demo DTE documents — F3.6 Slice E (T-44)
 *
 * Provides realistic seed DTEs so /admin/documentos, /cuenta/documentos,
 * and Libro de Ventas have data on a fresh demo.
 *
 * Strategy:
 *   - dte-demo-001: boleta for order-demo-001 (completed, Feb 2026)
 *   - dte-demo-002: factura for order-demo-003 (confirmed, Apr 2026)
 *   - dte-demo-003: boleta for order-demo-002 (pending transfer, Mar 2026)
 *   - dte-demo-nc-001: nota_credito (NC) referencing dte-demo-003 — anulado
 *   - dte-demo-nd-001: nota_debito (ND) referencing dte-demo-002 factura (Apr extra charge)
 *
 * Folio counter rows seeded separately so getFolioWithDb() continues from correct offset.
 *
 * IVA computed with computeIva: net = round(total / 1.19), taxAmount = total - net.
 * Idempotent: onConflictDoNothing everywhere (ids are deterministic).
 */

import type { InferInsertModel } from "drizzle-orm";
import { dteDocuments, dtefolioCounters } from "@/db/schema";

type NewDteDocument = InferInsertModel<typeof dteDocuments>;
type NewFolioCounter = InferInsertModel<typeof dtefolioCounters>;

const ISSUER_RUT = "76000000-0";
const CAMILA_RUT = "12345678-9"; // demo user with rut (factura)
const CONSUMER_RUT = "66666666-6"; // boleta fallback

// ---------------------------------------------------------------------------
// Helper: compute IVA (mirrors src/lib/dte/iva.ts)
// ---------------------------------------------------------------------------
function computeIva(total: number): { net: number; taxAmount: number } {
  const net = Math.round(total / 1.19);
  return { net, taxAmount: total - net };
}

// ---------------------------------------------------------------------------
// DTE seed rows
// ---------------------------------------------------------------------------

// order-demo-001: Royal Canin ×2 + shipping, total 102970, BOLETA
const boletaDemoIva = computeIva(102970);
const boletaDemo: NewDteDocument = {
  id: "dte-demo-001",
  dteId: "dte-demo-001",
  orderId: "order-demo-001",
  type: "boleta",
  documentCode: 39,
  folio: 1,
  status: "emitido",
  net: boletaDemoIva.net,
  taxAmount: boletaDemoIva.taxAmount,
  total: 102970,
  issuerRut: ISSUER_RUT,
  receiverRut: CONSUMER_RUT,
  receiverName: "Consumidor Final",
  receiverBusinessLine: null,
  receiverAddress: null,
  stamp: Buffer.from(`1|boleta|102970|2026-02-10T14:05:00.000Z`).toString("base64"),
  pdfUrl: "/api/dte/dte-demo-001/pdf",
  issuedAt: new Date("2026-02-10T14:05:00.000Z"),
  referenceDteId: null,
  cancellationReason: null,
  cancelledAt: null,
  createdAt: new Date("2026-02-10T14:05:00.000Z"),
  updatedAt: new Date("2026-02-10T14:05:00.000Z"),
};

// order-demo-003: Hill's ×3, total 59970, FACTURA (Camila with RUT)
const facturaIva = computeIva(59970);
const facturaDemo: NewDteDocument = {
  id: "dte-demo-002",
  dteId: "dte-demo-002",
  orderId: "order-demo-003",
  type: "factura",
  documentCode: 33,
  folio: 1,
  status: "emitido",
  net: facturaIva.net,
  taxAmount: facturaIva.taxAmount,
  total: 59970,
  issuerRut: ISSUER_RUT,
  receiverRut: CAMILA_RUT,
  receiverName: "Camila Rojas",
  receiverBusinessLine: "Comercio",
  receiverAddress: "Av. Las Condes 8500, Las Condes",
  stamp: Buffer.from(`1|factura|59970|2026-04-01T11:05:00.000Z`).toString("base64"),
  pdfUrl: "/api/dte/dte-demo-002/pdf",
  issuedAt: new Date("2026-04-01T11:05:00.000Z"),
  referenceDteId: null,
  cancellationReason: null,
  cancelledAt: null,
  createdAt: new Date("2026-04-01T11:05:00.000Z"),
  updatedAt: new Date("2026-04-01T11:05:00.000Z"),
};

// order-demo-002: Pro Plan ×1 + shipping, total 25980, BOLETA
const boletaDemo2Iva = computeIva(25980);
const boletaDemo2: NewDteDocument = {
  id: "dte-demo-003",
  dteId: "dte-demo-003",
  orderId: "order-demo-002",
  type: "boleta",
  documentCode: 39,
  folio: 2,
  status: "anulado", // this boleta will be anulado by an NC
  net: boletaDemo2Iva.net,
  taxAmount: boletaDemo2Iva.taxAmount,
  total: 25980,
  issuerRut: ISSUER_RUT,
  receiverRut: CONSUMER_RUT,
  receiverName: "Consumidor Final",
  receiverBusinessLine: null,
  receiverAddress: null,
  stamp: Buffer.from(`2|boleta|25980|2026-03-05T10:05:00.000Z`).toString("base64"),
  pdfUrl: "/api/dte/dte-demo-003/pdf",
  issuedAt: new Date("2026-03-05T10:05:00.000Z"),
  referenceDteId: null,
  cancellationReason: null,
  cancelledAt: new Date("2026-03-10T09:00:00.000Z"),
  createdAt: new Date("2026-03-05T10:05:00.000Z"),
  updatedAt: new Date("2026-03-10T09:00:00.000Z"),
};

// NC for dte-demo-003 (full anulación)
const ncIva = computeIva(25980);
const ncDemo: NewDteDocument = {
  id: "dte-demo-nc-001",
  dteId: "dte-demo-nc-001",
  orderId: null,
  type: "nota_credito",
  documentCode: 61,
  folio: 1,
  status: "emitido",
  net: ncIva.net,
  taxAmount: ncIva.taxAmount,
  total: 25980,
  issuerRut: ISSUER_RUT,
  receiverRut: CONSUMER_RUT,
  receiverName: "Consumidor Final",
  receiverBusinessLine: null,
  receiverAddress: null,
  stamp: Buffer.from(`1|nota_credito|25980|2026-03-10T09:00:00.000Z`).toString("base64"),
  pdfUrl: "/api/dte/dte-demo-nc-001/pdf",
  issuedAt: new Date("2026-03-10T09:00:00.000Z"),
  referenceDteId: "dte-demo-003",
  cancellationReason: "Error en precio original",
  cancelledAt: null,
  createdAt: new Date("2026-03-10T09:00:00.000Z"),
  updatedAt: new Date("2026-03-10T09:00:00.000Z"),
};

// ND for dte-demo-002 (factura, extra charge)
const ndAmount = 11900;
const ndIva = computeIva(ndAmount);
const ndDemo: NewDteDocument = {
  id: "dte-demo-nd-001",
  dteId: "dte-demo-nd-001",
  orderId: null,
  type: "nota_debito",
  documentCode: 56,
  folio: 1,
  status: "emitido",
  net: ndIva.net,
  taxAmount: ndIva.taxAmount,
  total: ndAmount,
  issuerRut: ISSUER_RUT,
  receiverRut: CAMILA_RUT,
  receiverName: "Camila Rojas",
  receiverBusinessLine: "Comercio",
  receiverAddress: null,
  stamp: Buffer.from(`1|nota_debito|${ndAmount}|2026-04-15T10:00:00.000Z`).toString("base64"),
  pdfUrl: "/api/dte/dte-demo-nd-001/pdf",
  issuedAt: new Date("2026-04-15T10:00:00.000Z"),
  referenceDteId: "dte-demo-002",
  cancellationReason: "Ajuste de precio por diferencia de tarifa",
  cancelledAt: null,
  createdAt: new Date("2026-04-15T10:00:00.000Z"),
  updatedAt: new Date("2026-04-15T10:00:00.000Z"),
};

export const demoDteDocuments: NewDteDocument[] = [
  boletaDemo,
  facturaDemo,
  boletaDemo2,
  ncDemo,
  ndDemo,
];

// ---------------------------------------------------------------------------
// Folio counter rows
// Seed starting points so getFolioWithDb() continues AFTER seed IDs.
// boleta: max seeded folio = 2 → lastFolio = 2
// factura: max seeded folio = 1 → lastFolio = 1
// nota_credito: max seeded folio = 1 → lastFolio = 1
// nota_debito: max seeded folio = 1 → lastFolio = 1
// ---------------------------------------------------------------------------
export const demoDteFolioCounters: NewFolioCounter[] = [
  { type: "boleta", lastFolio: 2 },
  { type: "factura", lastFolio: 1 },
  { type: "nota_credito", lastFolio: 1 },
  { type: "nota_debito", lastFolio: 1 },
];
