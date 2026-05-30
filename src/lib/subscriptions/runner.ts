/**
 * runner.ts — F3.5 Subscription cycle runner
 * runSubscriptionCycleWithDb: processes all due subscriptions.
 *
 * Per ADR-4 (design): button-triggered, PGlite-testable, per-subscription tx.
 * Each subscription runs in its own transaction so failure of one doesn't
 * affect others (CY-5, CY-6).
 */
import { db } from "@/db";
import {
  subscriptions,
  subscriptionCycles,
  checkoutSessions,
  orders,
  orderItems,
  pointsConfig,
  products,
  productVariants,
  users,
} from "@/db/schema";
import { eq, and, lte, or } from "drizzle-orm";
import { finalizeOrder } from "@/lib/checkout/finalize-order";
import { applySubscriptionDiscount } from "./pricing";
import { computeNextChargeAt } from "./frequency";
import { sendDemoEmail } from "@/lib/notifications/demo-email";
import { generateOrderNumber, todayDate } from "@/lib/checkout/order-number";
import { getGateway } from "@/lib/payments/registry";

type AnyDb = typeof db;

export interface RunnerOptions {
  now?: Date;
  /** Optional filter to run a single subscription (adelantar use case — R3) */
  subscriptionId?: string;
}

export interface CycleRunResult {
  succeeded: number;
  failed: number;
  skipped: number;
}

// ---------------------------------------------------------------------------
// getDueSubscriptionsWithDb — T-16
// ---------------------------------------------------------------------------

export async function getDueSubscriptionsWithDb(
  database: AnyDb,
  now: Date,
  subscriptionIdFilter?: string,
) {
  // Due = (active OR paused-with-expired-pausedUntil) AND nextChargeAt <= now
  // CY-1, CY-9: auto-resume paused subs with pausedUntil <= now
  const statusCondition = or(
    eq(subscriptions.status, "active"),
    and(
      eq(subscriptions.status, "paused"),
      lte(subscriptions.pausedUntil, now),
    ),
  );

  const baseConditions = [
    statusCondition!,
    lte(subscriptions.nextChargeAt, now),
  ];

  if (subscriptionIdFilter) {
    baseConditions.push(eq(subscriptions.id, subscriptionIdFilter));
  }

  return database
    .select()
    .from(subscriptions)
    .where(and(...baseConditions));
}

// ---------------------------------------------------------------------------
// runSubscriptionCycleWithDb — main runner (T-17..T-21)
// ---------------------------------------------------------------------------

export async function runSubscriptionCycleWithDb(
  database: AnyDb,
  options: RunnerOptions = {},
): Promise<CycleRunResult> {
  const now = options.now ?? new Date();
  const result: CycleRunResult = { succeeded: 0, failed: 0, skipped: 0 };

  // Fetch due subscriptions
  const dueSubs = await getDueSubscriptionsWithDb(database, now, options.subscriptionId);

  for (const sub of dueSubs) {
    try {
      // Auto-resume 1-cycle pause (CY-9): if pausedUntil <= now, clear it and activate
      if (sub.pausedUntil && sub.pausedUntil <= now) {
        await database
          .update(subscriptions)
          .set({ pausedUntil: null, status: "active", updatedAt: now })
          .where(eq(subscriptions.id, sub.id));
        sub.pausedUntil = null;
        sub.status = "active";
      }

      // Idempotency check (CY-10): if succeeded cycle already exists for current nextChargeAt window
      const existingCycles = await database
        .select()
        .from(subscriptionCycles)
        .where(and(
          eq(subscriptionCycles.subscriptionId, sub.id),
          eq(subscriptionCycles.status, "charged"),
        ));

      // Check if latest chargedAt matches approximately the cycle that corresponds to current nextChargeAt
      const hasSucceededForThisWindow = existingCycles.some((c) => {
        // A cycle is considered for "this window" if chargedAt is after (nextChargeAt - frequencyDays)
        if (!c.chargedAt) return false;
        const windowStart = new Date(sub.nextChargeAt.getTime() - sub.frequencyDays * 24 * 60 * 60 * 1000);
        return c.chargedAt >= windowStart && c.chargedAt <= now;
      });

      if (hasSucceededForThisWindow) {
        result.skipped++;
        continue;
      }

      // Process in its own transaction (CY-6, XC-5)
      await processSubscriptionCycle(database, sub, now);
      result.succeeded++;
    } catch (err) {
      // Isolation: partial failure doesn't block other subs (CY-5)
      // Increment failedAttempts and check for pause threshold
      await handleCycleFailure(database, sub, err, now);
      result.failed++;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// processSubscriptionCycle — per-subscription transaction (T-17)
// ---------------------------------------------------------------------------

async function processSubscriptionCycle(
  database: AnyDb,
  sub: typeof subscriptions.$inferSelect,
  now: Date,
): Promise<void> {
  // 1. Load product and variant for reprice
  const variantRows = await database
    .select({
      variantId: productVariants.id,
      productId: productVariants.productId,
      sku: productVariants.sku,
      name: productVariants.name,
      unitPrice: productVariants.priceAmount,
      featured: products.featured,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(productVariants.id, sub.variantId));

  if (variantRows.length === 0) {
    throw new Error(`Variant ${sub.variantId} not found`);
  }

  const variant = variantRows[0];

  // Check if product inactive (featured=false maps to "inactive" per repricer quirk — ADR-7 / R4)
  if (!variant.featured) {
    // R4: non-throwing path — log and fail the cycle
    const cycleId = crypto.randomUUID();
    await database.insert(subscriptionCycles).values({
      id: cycleId,
      subscriptionId: sub.id,
      status: "failed",
      attemptNumber: sub.failedAttempts + 1,
      failureReason: "product_inactive",
      createdAt: now,
    });
    await database
      .update(subscriptions)
      .set({ failedAttempts: sub.failedAttempts + 1, updatedAt: now })
      .where(eq(subscriptions.id, sub.id));

    // Check if we've hit 3 failures → pause
    if (sub.failedAttempts + 1 >= 3) {
      await pauseAndNotify(database, sub, now, "product_inactive");
    }
    throw new Error("product_inactive");
  }

  // 2. Apply subscription discount to compute discounted unit price
  const discountedPrice = applySubscriptionDiscount(variant.unitPrice, sub.discountPercent);

  // 3. Load user info
  const userRows = await database
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, sub.userId));

  if (userRows.length === 0) throw new Error(`User ${sub.userId} not found`);
  const user = userRows[0];

  // 4. Load points config for earning calculation
  const configRows = await database.select().from(pointsConfig).where(eq(pointsConfig.id, "singleton"));
  const earnRate = configRows[0]?.earnRatePerCLP ?? 100;

  // 5. Execute per-subscription transaction
  await database.transaction(async (tx) => {
    const quantity = sub.quantity;
    const lineTotal = discountedPrice * quantity;
    const subtotal = lineTotal;
    const shippingCost = 0;
    const total = subtotal;
    const pointsEarned = Math.floor(total / earnRate);

    // 5a. Insert synthetic checkout_session (CY-7, ADR-1: synthetic session in tx)
    const idempotencyKey = `sub:${sub.id}:${sub.nextChargeAt.toISOString()}`;
    const sessionId = crypto.randomUUID();
    const sessionExpiry = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
    const cartSnapshot = [{
      variantId: variant.variantId,
      productId: variant.productId,
      sku: variant.sku,
      name: variant.name,
      quantity,
      unitPrice: discountedPrice,
      lineTotal,
    }];

    await tx.insert(checkoutSessions).values({
      id: sessionId,
      userId: sub.userId,
      idempotencyKey,
      cartSnapshot,
      status: "completed",
      paymentGateway: "webpay_mock",
      expiresAt: sessionExpiry,
    });

    // 5b. Generate order number
    const today = todayDate();
    const orderNumber = await generateOrderNumber(today, tx as never);

    // 5c. Charge via gateway (getGateway already wraps with withFailureMode)
    const gateway = getGateway("webpay_mock");
    const chargeToken = `sub-charge-${sub.id}-${now.getTime()}`;
    const paymentResult = await gateway.verify(chargeToken);

    if (!paymentResult.approved) {
      throw new Error("payment_rejected");
    }

    // 5d. Insert order
    const orderId = crypto.randomUUID();
    await tx.insert(orders).values({
      id: orderId,
      orderNumber,
      userId: sub.userId,
      checkoutSessionId: sessionId,
      status: "confirmed",
      paymentStatus: "paid",
      paymentGateway: "webpay_mock",
      gatewayToken: chargeToken,
      address: {},
      shippingOptionId: "subscription",
      shippingCost,
      subtotal,
      discountTotal: 0,
      walletDiscount: 0,
      total,
      pointsRedeemed: 0,
      pointsEarned,
    });

    // 5e. Insert order items
    await tx.insert(orderItems).values({
      id: crypto.randomUUID(),
      orderId,
      productId: variant.productId,
      variantId: variant.variantId,
      sku: variant.sku,
      name: variant.name,
      quantity,
      unitPrice: discountedPrice,
      lineTotal,
    });

    // 5f. Call finalizeOrder (DTE, points, confirmation email, shipment) (CY-8)
    // Subscription renewals default to boleta with consumer RUT (no factura selection seam)
    await finalizeOrder(tx as never, {
      orderId,
      orderNumber,
      userId: sub.userId,
      userEmail: user.email,
      userName: user.name,
      cartSnapshot,
      subtotal,
      shippingCost,
      total,
      shippingAddress: {},
      paymentMethodLabel: "Suscripción",
      pointsEarned,
      // F3.6 — subscription renewals always use boleta default
      documentType: "boleta",
      receiver: { rut: "66666666-6", name: user.name },
      items: cartSnapshot.map((l) => ({
        description: l.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
        afecto: true,
      })),
    });

    // 5g. Write cycle row (status = 'charged')
    await tx.insert(subscriptionCycles).values({
      id: crypto.randomUUID(),
      subscriptionId: sub.id,
      orderId,
      status: "charged",
      chargedAt: now,
      attemptNumber: sub.failedAttempts + 1,
      createdAt: now,
    });

    // 5h. Advance nextChargeAt and reset failedAttempts
    const nextChargeAt = computeNextChargeAt(sub.nextChargeAt, sub.frequencyDays);
    await tx
      .update(subscriptions)
      .set({ nextChargeAt, lastChargedAt: now, failedAttempts: 0, updatedAt: now })
      .where(eq(subscriptions.id, sub.id));
  });
}

// ---------------------------------------------------------------------------
// handleCycleFailure — T-18
// ---------------------------------------------------------------------------

async function handleCycleFailure(
  database: AnyDb,
  sub: typeof subscriptions.$inferSelect,
  err: unknown,
  now: Date,
): Promise<void> {
  const failureReason = err instanceof Error ? err.message : "unknown";

  // Don't double-record for product_inactive (already handled in processSubscriptionCycle)
  if (failureReason === "product_inactive") return;

  const newFailedAttempts = sub.failedAttempts + 1;

  // Write failed cycle row
  await database.insert(subscriptionCycles).values({
    id: crypto.randomUUID(),
    subscriptionId: sub.id,
    status: "failed",
    attemptNumber: newFailedAttempts,
    failureReason,
    createdAt: now,
  });

  await database
    .update(subscriptions)
    .set({ failedAttempts: newFailedAttempts, updatedAt: now })
    .where(eq(subscriptions.id, sub.id));

  // R2: After 3 total failures → pause + send email
  if (newFailedAttempts >= 3) {
    await pauseAndNotify(database, sub, now, failureReason);
  }
}

// ---------------------------------------------------------------------------
// pauseAndNotify — pause subscription + send payment_failed email
// ---------------------------------------------------------------------------

async function pauseAndNotify(
  database: AnyDb,
  sub: typeof subscriptions.$inferSelect,
  now: Date,
  failureReason: string,
): Promise<void> {
  // Pause the subscription
  await database
    .update(subscriptions)
    .set({ status: "paused", updatedAt: now })
    .where(eq(subscriptions.id, sub.id));

  // Load user for email
  const userRows = await database
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, sub.userId));

  if (userRows.length === 0) return;
  const user = userRows[0];

  // Load product name
  const productRows = await database
    .select({ name: products.name })
    .from(products)
    .where(eq(products.id, sub.productId));

  const productName = productRows[0]?.name ?? "producto";

  // Send payment failed email (SN-4, CY-4)
  await sendDemoEmail({
    to: user.email,
    toUserId: sub.userId,
    type: "subscription_payment_failed",
    data: {
      userName: user.name,
      productName,
      failureReason,
    },
    executor: database as never,
  });
}
