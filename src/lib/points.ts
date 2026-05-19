/**
 * Pure compute helpers for points and pets — no I/O, fully unit-tested.
 */

// ---------------------------------------------------------------------------
// computeBalance
// ---------------------------------------------------------------------------
export function computeBalance(txs: { deltaPoints: number }[]): number {
  return txs.reduce((acc, tx) => acc + tx.deltaPoints, 0);
}

// ---------------------------------------------------------------------------
// filterPetsBornInMonth
// ---------------------------------------------------------------------------
export function filterPetsBornInMonth<P extends { birthDate: string | null }>(
  pets: P[],
  month: number,
): P[] {
  return pets.filter((pet) => {
    if (!pet.birthDate) return false;
    const parts = pet.birthDate.split("-");
    if (parts.length < 2) return false;
    return parseInt(parts[1], 10) === month;
  });
}

// ---------------------------------------------------------------------------
// isFirstPurchase
// ---------------------------------------------------------------------------
export function isFirstPurchase(prior: { kind: string }[]): boolean {
  return !prior.some(
    (tx) => tx.kind === "purchase" || tx.kind === "first_purchase_bonus",
  );
}
