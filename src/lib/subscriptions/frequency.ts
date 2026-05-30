/**
 * frequency.ts — F3.5 Subscription frequency utilities
 * Pure functions: no DB, no side effects.
 */

/**
 * Returns true if frequencyDays is in the product's allowed frequencies list.
 */
export function isValidFrequency(allowedFrequencies: number[], frequencyDays: number): boolean {
  return allowedFrequencies.includes(frequencyDays);
}

/**
 * Computes the next charge date by adding frequencyDays to the given base date.
 * Returns a new Date object (does not mutate base).
 */
export function computeNextChargeAt(base: Date, frequencyDays: number): Date {
  const result = new Date(base);
  result.setDate(result.getDate() + frequencyDays);
  return result;
}
