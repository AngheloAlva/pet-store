/**
 * reminder.ts — F3.5 Subscription reminder idempotency helper
 * Pure function: no DB, no side effects.
 *
 * shouldSendReminder returns true only when:
 * 1. The subscription is active
 * 2. nextChargeAt - now <= reminderDays (within the window)
 * 3. No cycle row has reminderSentAt set for the current cycle window
 */

export interface SubscriptionReminder {
  nextChargeAt: Date;
  status: string;
}

export interface CycleRowReminder {
  subscriptionId?: string;
  reminderSentAt: Date | null;
}

/**
 * Determines whether a subscription reminder should be sent.
 */
export function shouldSendReminder(
  subscription: SubscriptionReminder,
  cycleRows: CycleRowReminder[],
  now: Date,
  reminderDays: number,
): boolean {
  // Only send for active subscriptions
  if (subscription.status !== "active") return false;

  // Check window: nextChargeAt - now <= reminderDays
  const msUntilCharge = subscription.nextChargeAt.getTime() - now.getTime();
  const msWindow = reminderDays * 24 * 60 * 60 * 1000;
  if (msUntilCharge > msWindow) return false;

  // Check idempotency: if any cycle row has reminderSentAt set, skip
  const alreadySent = cycleRows.some((row) => row.reminderSentAt !== null);
  if (alreadySent) return false;

  return true;
}
