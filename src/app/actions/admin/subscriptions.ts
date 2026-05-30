"use server";

/**
 * Admin subscription actions — F3.5
 * updateSubscriptionConfigWithDb: admin action to configure subscription on a product.
 * runSubscriptionCycle: admin-gated runner trigger.
 * advanceSubscription: admin-gated "adelantar próximo cobro".
 */
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { users, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type AnyDb = typeof db;

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const ALLOWED_FREQUENCIES = [15, 30, 45, 60] as const;
const ALLOWED_DISCOUNTS = [0, 5, 10] as const;

const subscriptionConfigSchema = z.object({
  productId: z.string().min(1),
  subscriptionEnabled: z.boolean(),
  subscriptionFrequencies: z.array(z.number().int()).refine(
    (freqs) => freqs.every((f) => (ALLOWED_FREQUENCIES as readonly number[]).includes(f)),
    { message: "All frequencies must be one of: 15, 30, 45, 60" },
  ),
  subscriptionDiscountPercent: z.number().int().refine(
    (d) => (ALLOWED_DISCOUNTS as readonly number[]).includes(d),
    { message: "Discount must be one of: 0, 5, 10" },
  ),
});

export type SubscriptionConfigInput = z.infer<typeof subscriptionConfigSchema>;

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type UpdateSubscriptionConfigResult =
  | { ok: true }
  | { ok: false; code: "UNAUTHENTICATED" | "FORBIDDEN" | "VALIDATION" | "NOT_FOUND"; message?: string };

// ---------------------------------------------------------------------------
// updateSubscriptionConfigWithDb
// ---------------------------------------------------------------------------

export async function updateSubscriptionConfigWithDb(
  database: AnyDb,
  adminUserId: string,
  input: SubscriptionConfigInput,
): Promise<UpdateSubscriptionConfigResult> {
  // Admin role check
  const userRows = await database
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, adminUserId));

  if (userRows.length === 0 || userRows[0].role !== "admin") {
    return { ok: false, code: "FORBIDDEN" };
  }

  // Validate input
  const parsed = subscriptionConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION", message: JSON.stringify(parsed.error.flatten()) };
  }

  const { productId, subscriptionEnabled, subscriptionFrequencies, subscriptionDiscountPercent } = parsed.data;

  // If disabling, enforce empty frequencies and 0 discount
  const finalFrequencies = subscriptionEnabled ? subscriptionFrequencies : [];
  const finalDiscount = subscriptionEnabled ? subscriptionDiscountPercent : 0;

  await database
    .update(products)
    .set({
      subscriptionEnabled,
      subscriptionFrequencies: finalFrequencies,
      subscriptionDiscountPercent: finalDiscount,
    })
    .where(eq(products.id, productId));

  revalidatePath(`/admin/productos/${productId}/editar`);
  revalidatePath("/admin/productos");

  return { ok: true };
}

export async function updateSubscriptionConfig(
  input: SubscriptionConfigInput,
): Promise<UpdateSubscriptionConfigResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };
  if (user.role !== "admin") return { ok: false, code: "FORBIDDEN" };

  return updateSubscriptionConfigWithDb(db, user.id, input);
}

// ---------------------------------------------------------------------------
// runSubscriptionCycle (admin-gated — delegates to runner)
// ---------------------------------------------------------------------------

export type RunCycleResult =
  | { ok: true; result: { succeeded: number; failed: number; skipped: number } }
  | { ok: false; code: "UNAUTHENTICATED" | "FORBIDDEN" };

export async function runSubscriptionCycle(): Promise<RunCycleResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };
  if (user.role !== "admin") return { ok: false, code: "FORBIDDEN" };

  const { runSubscriptionCycleWithDb } = await import("@/lib/subscriptions/runner");
  const result = await runSubscriptionCycleWithDb(db, { now: new Date() });
  return { ok: true, result };
}

// ---------------------------------------------------------------------------
// advanceSubscription (admin-gated — "adelantar próximo cobro")
// R3 reconciliation: sets nextChargeAt = now() then runs runner scoped to this sub
// ---------------------------------------------------------------------------

export type AdvanceSubscriptionResult =
  | { ok: true; result: { succeeded: number; failed: number; skipped: number } }
  | { ok: false; code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" };

export async function advanceSubscription(
  subscriptionId: string,
): Promise<AdvanceSubscriptionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };
  if (user.role !== "admin") return { ok: false, code: "FORBIDDEN" };

  return advanceSubscriptionWithDb(db, subscriptionId);
}

export async function advanceSubscriptionWithDb(
  database: AnyDb,
  subscriptionId: string,
): Promise<AdvanceSubscriptionResult> {
  const { subscriptions } = await import("@/db/schema");

  const rows = await database
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId));

  if (rows.length === 0) return { ok: false, code: "NOT_FOUND" };

  const now = new Date();

  // Set nextChargeAt = now so the runner picks it up
  await database
    .update(subscriptions)
    .set({ nextChargeAt: now, updatedAt: now })
    .where(eq(subscriptions.id, subscriptionId));

  const { runSubscriptionCycleWithDb } = await import("@/lib/subscriptions/runner");
  const result = await runSubscriptionCycleWithDb(database, { now, subscriptionId });
  return { ok: true, result };
}
