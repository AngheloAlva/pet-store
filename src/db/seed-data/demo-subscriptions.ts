/**
 * Demo subscriptions for user-camila-demo — F3.5 T-32
 *
 * Creates 2 subscriptions so /cuenta/suscripciones is non-empty in demo/QA.
 * Deterministic IDs: sub-camila-001 (active), sub-camila-002 (paused).
 * Idempotent: onConflictDoUpdate pattern (mirrors seed.ts convention).
 *
 * Uses existing product + variant IDs from fixtures:
 *   - rc-medium-adult / rc-ma-3 (Royal Canin Medium Adult 3 kg)
 *   - proplan-adult-complete / pp-ac-3 (Pro Plan Adult Complete 3 kg)
 *
 * NOTE: The products are seeded first via applySeed(). These subscription rows
 * are seeded AFTER products/variants exist. Subscriptions reference the
 * subscription_enabled-capable products (subscription config can be enabled
 * via the admin UI after seeding).
 */

import type { InferInsertModel } from "drizzle-orm";
import { subscriptions } from "@/db/schema";

type NewSubscription = InferInsertModel<typeof subscriptions>;

const CAMILA_USER_ID = "user-camila-demo";

// Fixed reference date for reproducibility
const SEED_DATE = new Date("2026-05-30T12:00:00.000Z");

// Active subscription — Royal Canin Medium Adult, every 30 days, 10% off
const activeSub: NewSubscription = {
  id: "sub-camila-001",
  userId: CAMILA_USER_ID,
  productId: "rc-medium-adult",
  variantId: "rc-ma-3",
  frequencyDays: 30,
  discountPercent: 10,
  quantity: 1,
  status: "active",
  nextChargeAt: new Date("2026-06-15T12:00:00.000Z"),
  pausedUntil: null,
  failedAttempts: 0,
  lastChargedAt: new Date("2026-05-16T12:00:00.000Z"),
  createdAt: SEED_DATE,
  updatedAt: SEED_DATE,
};

// Paused subscription — Pro Plan Adult Complete, every 60 days, 5% off
const pausedSub: NewSubscription = {
  id: "sub-camila-002",
  userId: CAMILA_USER_ID,
  productId: "proplan-adult-complete",
  variantId: "pp-ac-3",
  frequencyDays: 60,
  discountPercent: 5,
  quantity: 1,
  status: "paused",
  nextChargeAt: new Date("2026-07-01T12:00:00.000Z"),
  pausedUntil: null,
  failedAttempts: 0,
  lastChargedAt: new Date("2026-05-01T12:00:00.000Z"),
  createdAt: SEED_DATE,
  updatedAt: SEED_DATE,
};

export const demoSubscriptions: NewSubscription[] = [activeSub, pausedSub];
