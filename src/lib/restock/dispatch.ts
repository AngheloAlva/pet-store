import { db } from "@/db";
import { restockAlerts, products, productVariants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendDemoEmail } from "@/lib/notifications/demo-email";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface RestockEvent {
  variantId: string;
  storeId: string;
  storeName: string;
  productName: string;
  variantName?: string;
}

export interface DispatchInput {
  productId: string;
  events: RestockEvent[];
}

export interface DispatchResult {
  fired: number;
  skipped: number;
}

// ---------------------------------------------------------------------------
// dispatchRestockAlerts
// ---------------------------------------------------------------------------
/**
 * For each restock event (variant flipped out_of_stock → in_stock), query
 * pending alerts for the product, filter in-memory by variantId and storeIds,
 * then fire emails best-effort and update status to "fired".
 */
export async function dispatchRestockAlerts(
  input: DispatchInput,
): Promise<DispatchResult> {
  const { productId, events } = input;

  if (events.length === 0) return { fired: 0, skipped: 0 };

  // SELECT all pending alerts for this product
  const pendingAlerts = await db
    .select()
    .from(restockAlerts)
    .where(and(eq(restockAlerts.productId, productId), eq(restockAlerts.status, "pending")));

  if (pendingAlerts.length === 0) return { fired: 0, skipped: 0 };

  // Resolve product name (use from first event or DB lookup)
  const productRows = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(eq(products.id, productId));
  const productName = productRows[0]?.name ?? events[0]?.productName ?? "";

  // Build a variant name map for all unique variantIds in events
  const variantIds = [...new Set(events.map((e) => e.variantId))];
  const variantMap = new Map<string, string>();
  for (const variantId of variantIds) {
    const variantRows = await db
      .select({ id: productVariants.id, name: productVariants.name })
      .from(productVariants)
      .where(eq(productVariants.id, variantId));
    if (variantRows[0]) {
      variantMap.set(variantId, variantRows[0].name);
    }
  }

  let fired = 0;
  let skipped = 0;

  for (const alert of pendingAlerts) {
    // Find the first event that matches this alert
    const matchingEvent = events.find((ev) => {
      // variantId match: alert.variantId must equal event.variantId OR be null (any variant)
      const variantMatches = alert.variantId === null || alert.variantId === ev.variantId;
      // storeIds match: alert.storeIds must be null (any store) OR contain ev.storeId
      const storeMatches =
        alert.storeIds === null || alert.storeIds.includes(ev.storeId);
      return variantMatches && storeMatches;
    });

    if (!matchingEvent) continue;

    const variantName = matchingEvent
      ? variantMap.get(matchingEvent.variantId)
      : undefined;

    const cancelUrl = `${BASE_URL}/alertas/cancelar?token=${alert.cancelToken}`;

    try {
      await sendDemoEmail({
        type: "restock_alert",
        to: alert.email,
        toUserId: alert.userId ?? undefined,
        data: {
          productName,
          variantName,
          storeName: matchingEvent.storeName,
          cancelUrl,
        },
      });

      await db
        .update(restockAlerts)
        .set({ status: "fired", firedAt: new Date() })
        .where(eq(restockAlerts.id, alert.id));

      fired++;
    } catch (err) {
      console.warn("[restock/dispatch] email failed for alert", alert.id, err);
      skipped++;
    }
  }

  return { fired, skipped };
}
