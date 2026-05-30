/**
 * DTEProvider port — F3.1 / F3.6
 * Isolates the DTE (electronic document) integration seam.
 * F3.6 widens the interface with full issuance/folio/cancel capabilities.
 */
import type { DteType, DteDocumentCode } from "@/db/schema";

// ---------------------------------------------------------------------------
// Shared value types
// ---------------------------------------------------------------------------

export interface DteReceiver {
  rut: string;
  name: string;
  businessLine?: string;
  address?: string;
}

export interface DTEItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  afecto: boolean;
}

// ---------------------------------------------------------------------------
// Issue / Cancel I/O
// ---------------------------------------------------------------------------

export interface DteIssueInput {
  orderId: string | null;
  documentType: DteType;
  items: DTEItem[];
  receiver: DteReceiver;
  total: number;
  issuerRut: string;
}

export interface DTEIssueResult {
  dteId: string;
  folio: number;
  documentCode: DteDocumentCode;
  type: DteType;
  net: number;
  taxAmount: number;
  total: number;
  stamp: string;
  pdfUrl: string;
  // legacy field kept for backward compat with F3.1 callers
  documentType: DteType;
}

export interface CancelInput {
  dteId: string;
  reason: string;
  amount?: number;
}

// ---------------------------------------------------------------------------
// Typed error
// ---------------------------------------------------------------------------

export class DteMissingReceiverRutError extends Error {
  readonly code = "DTE_MISSING_RECEIVER_RUT" as const;

  constructor() {
    super("Factura requires a non-empty receiver RUT.");
    this.name = "DteMissingReceiverRutError";
  }
}

// ---------------------------------------------------------------------------
// Provider interface (F3.6 widened)
// ---------------------------------------------------------------------------

type DbLike = unknown;

export interface DTEProvider {
  issueDocument(db: DbLike, input: DteIssueInput): Promise<DTEIssueResult>;
  cancelDocument(db: DbLike, input: CancelInput): Promise<DTEIssueResult>;
  getFolio(db: DbLike, type: DteType): Promise<number>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface UserLike {
  rut?: string | null;
  name?: string | null;
}

/**
 * Builds a minimal boleta DteReceiver.
 * Falls back to the anonymous consumer RUT '66666666-6' when the user has no RUT.
 * Spec: I-2, C-4
 */
export function buildBoletaReceiver(user: UserLike): DteReceiver {
  return {
    rut: user.rut ?? "66666666-6",
    name: user.name ?? "Consumidor Final",
  };
}
