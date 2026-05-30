"use server";

/**
 * Subscription CRUD actions — F3.5
 * All *WithDb functions accept a database injection for testability (PGlite).
 * Thin no-arg server-action wrappers call getCurrentUser() then delegate.
 * Cross-user guard: every query includes userId filter (mirrors direcciones.ts).
 */
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { subscriptions, products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { isValidFrequency, computeNextChargeAt } from "@/lib/subscriptions/frequency";
import { assertValidTransition } from "@/lib/subscriptions/status";

type AnyDb = typeof db;

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type SubscriptionResult =
  | { ok: true; subscriptionId: string }
  | { ok: false; code: "UNAUTHENTICATED" | "NOT_FOUND" | "INVALID_FREQUENCY" | "INVALID_TRANSITION" | "VALIDATION" | "FORBIDDEN"; message?: string };

export type MutationResult =
  | { ok: true }
  | { ok: false; code: "UNAUTHENTICATED" | "NOT_FOUND" | "INVALID_FREQUENCY" | "INVALID_TRANSITION" | "VALIDATION" | "FORBIDDEN"; message?: string };

// ---------------------------------------------------------------------------
// createSubscriptionWithDb
// ---------------------------------------------------------------------------

export interface CreateSubscriptionInput {
  userId: string;
  productId: string;
  variantId: string;
  frequencyDays: number;
  discountPercent: number;
  now?: Date;
}

export async function createSubscriptionWithDb(
  database: AnyDb,
  input: CreateSubscriptionInput,
): Promise<SubscriptionResult> {
  const { userId, productId, variantId, frequencyDays, discountPercent, now = new Date() } = input;

  // Validate frequency against product's allowed list
  const productRows = await database
    .select({ subscriptionFrequencies: products.subscriptionFrequencies })
    .from(products)
    .where(eq(products.id, productId));

  if (productRows.length === 0) {
    return { ok: false, code: "NOT_FOUND", message: "Product not found" };
  }

  const allowedFrequencies = productRows[0].subscriptionFrequencies;
  if (!isValidFrequency(allowedFrequencies, frequencyDays)) {
    return { ok: false, code: "INVALID_FREQUENCY", message: `Frequency ${frequencyDays} not allowed for this product` };
  }

  const id = randomUUID();
  const nextChargeAt = computeNextChargeAt(now, frequencyDays);

  await database.insert(subscriptions).values({
    id,
    userId,
    productId,
    variantId,
    frequencyDays,
    discountPercent,
    status: "active",
    nextChargeAt,
    createdAt: now,
    updatedAt: now,
  });

  return { ok: true, subscriptionId: id };
}

export async function createSubscription(
  input: Omit<CreateSubscriptionInput, "userId" | "now">,
): Promise<SubscriptionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };
  const result = await createSubscriptionWithDb(db, { ...input, userId: user.id });
  if (result.ok) revalidatePath("/cuenta/suscripciones");
  return result;
}

// ---------------------------------------------------------------------------
// getSubscriptionsWithDb
// ---------------------------------------------------------------------------

export async function getSubscriptionsWithDb(
  database: AnyDb,
  userId: string,
) {
  return database
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));
}

export async function getSubscriptions() {
  const user = await getCurrentUser();
  if (!user) return [];
  return getSubscriptionsWithDb(db, user.id);
}

// ---------------------------------------------------------------------------
// getSubscriptionWithDb
// ---------------------------------------------------------------------------

export async function getSubscriptionWithDb(
  database: AnyDb,
  userId: string,
  subscriptionId: string,
) {
  const rows = await database
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)));

  return rows.length > 0 ? rows[0] : null;
}

export async function getSubscription(subscriptionId: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  return getSubscriptionWithDb(db, user.id, subscriptionId);
}

// ---------------------------------------------------------------------------
// pauseSubscriptionWithDb
// ---------------------------------------------------------------------------

export type PauseOptions =
  | { type: "indefinite" }
  | { type: "one_cycle" };

export async function pauseSubscriptionWithDb(
  database: AnyDb,
  userId: string,
  subscriptionId: string,
  options: PauseOptions,
): Promise<MutationResult> {
  // Ownership check
  const rows = await database
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)));

  if (rows.length === 0) return { ok: false, code: "NOT_FOUND" };

  const sub = rows[0];

  try {
    assertValidTransition(sub.status as "active" | "paused" | "cancelled", "paused");
  } catch {
    return { ok: false, code: "INVALID_TRANSITION" };
  }

  let pausedUntil: Date | null = null;
  if (options.type === "one_cycle") {
    pausedUntil = computeNextChargeAt(sub.nextChargeAt, sub.frequencyDays);
  }

  await database
    .update(subscriptions)
    .set({ status: "paused", pausedUntil, updatedAt: new Date() })
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)));

  return { ok: true };
}

export async function pauseSubscription(
  subscriptionId: string,
  options: PauseOptions,
): Promise<MutationResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };
  const result = await pauseSubscriptionWithDb(db, user.id, subscriptionId, options);
  if (result.ok) revalidatePath("/cuenta/suscripciones");
  return result;
}

// ---------------------------------------------------------------------------
// resumeSubscriptionWithDb
// ---------------------------------------------------------------------------

export async function resumeSubscriptionWithDb(
  database: AnyDb,
  userId: string,
  subscriptionId: string,
  now: Date = new Date(),
): Promise<MutationResult> {
  const rows = await database
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)));

  if (rows.length === 0) return { ok: false, code: "NOT_FOUND" };

  const sub = rows[0];

  try {
    assertValidTransition(sub.status as "active" | "paused" | "cancelled", "active");
  } catch {
    return { ok: false, code: "INVALID_TRANSITION" };
  }

  const nextChargeAt = computeNextChargeAt(now, sub.frequencyDays);

  await database
    .update(subscriptions)
    .set({ status: "active", pausedUntil: null, nextChargeAt, updatedAt: new Date() })
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)));

  return { ok: true };
}

export async function resumeSubscription(
  subscriptionId: string,
): Promise<MutationResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };
  const result = await resumeSubscriptionWithDb(db, user.id, subscriptionId);
  if (result.ok) revalidatePath("/cuenta/suscripciones");
  return result;
}

// ---------------------------------------------------------------------------
// changeFrequencyWithDb
// ---------------------------------------------------------------------------

export async function changeFrequencyWithDb(
  database: AnyDb,
  userId: string,
  subscriptionId: string,
  newFrequencyDays: number,
  now: Date = new Date(),
): Promise<MutationResult> {
  const rows = await database
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)));

  if (rows.length === 0) return { ok: false, code: "NOT_FOUND" };

  const sub = rows[0];

  // Validate frequency against product's allowed list
  const productRows = await database
    .select({ subscriptionFrequencies: products.subscriptionFrequencies })
    .from(products)
    .where(eq(products.id, sub.productId));

  if (productRows.length === 0) return { ok: false, code: "NOT_FOUND" };

  const allowedFrequencies = productRows[0].subscriptionFrequencies;
  if (!isValidFrequency(allowedFrequencies, newFrequencyDays)) {
    return { ok: false, code: "INVALID_FREQUENCY", message: `Frequency ${newFrequencyDays} not allowed for this product` };
  }

  const nextChargeAt = computeNextChargeAt(now, newFrequencyDays);

  await database
    .update(subscriptions)
    .set({ frequencyDays: newFrequencyDays, nextChargeAt, updatedAt: new Date() })
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)));

  return { ok: true };
}

export async function changeFrequency(
  subscriptionId: string,
  newFrequencyDays: number,
): Promise<MutationResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };
  const result = await changeFrequencyWithDb(db, user.id, subscriptionId, newFrequencyDays);
  if (result.ok) revalidatePath("/cuenta/suscripciones");
  return result;
}

// ---------------------------------------------------------------------------
// changeVariantWithDb
// ---------------------------------------------------------------------------

export async function changeVariantWithDb(
  database: AnyDb,
  userId: string,
  subscriptionId: string,
  newVariantId: string,
): Promise<MutationResult> {
  const rows = await database
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)));

  if (rows.length === 0) return { ok: false, code: "NOT_FOUND" };

  await database
    .update(subscriptions)
    .set({ variantId: newVariantId, updatedAt: new Date() })
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)));

  return { ok: true };
}

export async function changeVariant(
  subscriptionId: string,
  newVariantId: string,
): Promise<MutationResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };
  const result = await changeVariantWithDb(db, user.id, subscriptionId, newVariantId);
  if (result.ok) revalidatePath("/cuenta/suscripciones");
  return result;
}

// ---------------------------------------------------------------------------
// cancelSubscriptionWithDb
// ---------------------------------------------------------------------------

export async function cancelSubscriptionWithDb(
  database: AnyDb,
  userId: string,
  subscriptionId: string,
): Promise<MutationResult> {
  const rows = await database
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)));

  if (rows.length === 0) return { ok: false, code: "NOT_FOUND" };

  const sub = rows[0];

  try {
    assertValidTransition(sub.status as "active" | "paused" | "cancelled", "cancelled");
  } catch {
    return { ok: false, code: "INVALID_TRANSITION" };
  }

  await database
    .update(subscriptions)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)));

  return { ok: true };
}

export async function cancelSubscription(
  subscriptionId: string,
): Promise<MutationResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };
  const result = await cancelSubscriptionWithDb(db, user.id, subscriptionId);
  if (result.ok) revalidatePath("/cuenta/suscripciones");
  return result;
}
