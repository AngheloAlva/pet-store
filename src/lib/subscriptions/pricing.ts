/**
 * pricing.ts — F3.5 Subscription pricing utilities
 * Pure functions: no DB, no side effects.
 */

/**
 * Apply a subscription discount to a unit price.
 * Returns floor(unitPrice * (100 - discountPercent) / 100).
 */
export function applySubscriptionDiscount(unitPrice: number, discountPercent: number): number {
  return Math.floor((unitPrice * (100 - discountPercent)) / 100);
}
