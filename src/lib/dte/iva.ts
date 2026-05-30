/**
 * IVA computation helpers — F3.6
 * Top-down approach: net = round(total / 1.19), taxAmount = total - net.
 * Guarantees net + taxAmount === total exactly (no rounding drift).
 * Spec: F-3, INV-2
 */

export interface IvaResult {
  net: number;
  taxAmount: number;
}

/**
 * Computes IVA breakdown from a gross total (integer CLP).
 * net + taxAmount === total is guaranteed by construction.
 */
export function computeIva(total: number): IvaResult {
  const net = Math.round(total / 1.19);
  const taxAmount = total - net;
  return { net, taxAmount };
}
