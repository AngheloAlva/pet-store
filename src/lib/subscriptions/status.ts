/**
 * status.ts — F3.5 Subscription state machine
 * Pure functions: no DB, no side effects.
 *
 * Valid transitions:
 *   active  → paused, cancelled
 *   paused  → active, cancelled
 *   cancelled → (terminal, no transitions)
 *   same → same: no-op (allowed, idempotent)
 */
import type { SubscriptionStatus } from "@/db/schema";

const VALID_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  active: ["active", "paused", "cancelled"],
  paused: ["paused", "active", "cancelled"],
  cancelled: ["cancelled"], // terminal — only same-state no-op
};

/**
 * Asserts that the transition from `from` to `to` is legal.
 * Throws an Error if the transition is invalid.
 */
export function assertValidTransition(
  from: SubscriptionStatus,
  to: SubscriptionStatus,
): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(
      `Invalid subscription status transition: ${from} → ${to}`,
    );
  }
}
