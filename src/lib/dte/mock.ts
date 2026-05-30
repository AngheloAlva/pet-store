/**
 * MockDTEProvider (legacy) — F3.1
 * Returns a deterministic dteId based on the order id.
 * No network calls. No PDF generation.
 *
 * NOTE: F3.6 introduces a new MockDTEProvider in mock-provider.ts
 * with the full F3.6 interface. This file is kept for backward compat
 * with existing callers that use the old issue() seam.
 */

export interface LegacyDTEIssueInput {
  id: string;
  documentType: "boleta" | "factura";
  rut?: string;
}

export interface LegacyDTEIssueResult {
  dteId: string;
  documentType: "boleta" | "factura";
}

export class MockDTEProvider {
  async issue(order: LegacyDTEIssueInput): Promise<LegacyDTEIssueResult> {
    const suffix = order.id.replace(/-/g, "").slice(0, 8).toUpperCase();
    return {
      dteId: `DTE-MOCK-${suffix}`,
      documentType: order.documentType,
    };
  }
}

export const mockDTEProvider = new MockDTEProvider();
