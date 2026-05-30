/**
 * MockDTEProvider (F3.6) — full interface implementation
 * - Folio: delegates to getFolioWithDb (FOR-UPDATE counter per type)
 * - IVA: computed via computeIva (top-down, net+tax===total)
 * - Stamp: deterministic base64 of `{folio}|{type}|{total}|{issuedAt}`
 * - pdfUrl: `/api/dte/{id}/pdf`
 * Spec: I-4, I-5, C-3, C-4, I-3, P-3
 */
import { DteMissingReceiverRutError } from "@/lib/dte/provider";
import type { DTEProvider, DteIssueInput, DTEIssueResult, CancelInput, DteReceiver } from "@/lib/dte/provider";
import { getFolioWithDb } from "@/lib/dte/folio";
import { computeIva } from "@/lib/dte/iva";
import { DTE_DOCUMENT_CODE } from "@/db/schema";
import type { DteType } from "@/db/schema";

// Re-export for convenience (tests import DteIssueInput from this file)
export type { DteIssueInput };

type DbLike = unknown;

export class MockDTEProvider implements DTEProvider {
  /**
   * Issues a DTE document.
   * @param issuedAt Optional fixed date — used in tests for deterministic stamps.
   */
  async issueDocument(
    db: DbLike,
    input: DteIssueInput,
    issuedAt?: Date,
  ): Promise<DTEIssueResult> {
    const { documentType, receiver, total, issuerRut, orderId } = input;

    // Guard: factura must have a non-empty RUT
    if (documentType === "factura" && !receiver.rut) {
      throw new DteMissingReceiverRutError();
    }

    const folio = await getFolioWithDb(db as never, documentType);
    const { net, taxAmount } = computeIva(total);
    const now = issuedAt ?? new Date();
    const dteId = crypto.randomUUID();

    // Deterministic stamp: base64 of `{folio}|{type}|{total}|{issuedAt}`
    const stampRaw = `${folio}|${documentType}|${total}|${now.toISOString()}`;
    const stamp = Buffer.from(stampRaw).toString("base64");

    const documentCode = DTE_DOCUMENT_CODE[documentType as keyof typeof DTE_DOCUMENT_CODE] ?? 39;
    const pdfUrl = `/api/dte/${dteId}/pdf`;

    return {
      dteId,
      folio,
      documentCode: documentCode as DTEIssueResult["documentCode"],
      type: documentType,
      net,
      taxAmount,
      total,
      stamp,
      pdfUrl,
      // legacy compat
      documentType,
    };
  }

  async cancelDocument(db: DbLike, input: CancelInput): Promise<DTEIssueResult> {
    const { dteId, reason } = input;
    // Minimal stub — full implementation in Slice D
    return this.issueDocument(db, {
      orderId: null,
      documentType: "nota_credito",
      items: [],
      receiver: { rut: "66666666-6", name: "Consumidor Final" },
      total: 0,
      issuerRut: "76000000-0",
    });
  }

  async getFolio(db: DbLike, type: DteType): Promise<number> {
    return getFolioWithDb(db as never, type);
  }
}

export const mockDTEProvider = new MockDTEProvider();
