/**
 * DTEProvider port — F3.1
 * Isolates the DTE (electronic document) integration seam.
 * F3.6 swaps the mock implementation for a real provider; signature stays.
 */

export interface DTEIssueInput {
  id: string;
  documentType: "boleta" | "factura";
  rut?: string;
}

export interface DTEIssueResult {
  dteId: string;
  documentType: "boleta" | "factura";
}

export interface DTEProvider {
  issue(order: DTEIssueInput): Promise<DTEIssueResult>;
}
