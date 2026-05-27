/**
 * MockDTEProvider — F3.1
 * Returns a deterministic dteId based on the order id.
 * No network calls. No PDF generation.
 */
import type { DTEProvider, DTEIssueInput, DTEIssueResult } from "./provider";

export class MockDTEProvider implements DTEProvider {
  async issue(order: DTEIssueInput): Promise<DTEIssueResult> {
    const suffix = order.id.replace(/-/g, "").slice(0, 8).toUpperCase();
    return {
      dteId: `DTE-MOCK-${suffix}`,
      documentType: order.documentType,
    };
  }
}

export const mockDTEProvider = new MockDTEProvider();
