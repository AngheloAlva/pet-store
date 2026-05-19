"use server";

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { restockAlerts } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import {
  createRestockAlertSchema,
  cancelRestockAlertSchema,
} from "./restock-alerts.schema";

// ---------------------------------------------------------------------------
// Auth helper (requireUser — throws redirect if unauthenticated)
// ---------------------------------------------------------------------------
async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

// ---------------------------------------------------------------------------
// createRestockAlert
// ---------------------------------------------------------------------------
export type CreateRestockAlertResult =
  | { ok: true; alertId: string; cancelToken: string }
  | { ok: false; errors: Record<string, string[]> };

export async function createRestockAlert(
  input: unknown,
): Promise<CreateRestockAlertResult> {
  const user = await getCurrentUser();

  const parsed = createRestockAlertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const data = parsed.data;

  // Determine email + userId
  let email: string;
  let userId: string | null = null;

  if (user) {
    email = user.email;
    userId = user.id;
  } else {
    // Anonymous: email is required
    if (!data.email) {
      return {
        ok: false,
        errors: { email: ["Email es obligatorio para suscribirse sin sesión"] },
      };
    }
    email = data.email;
  }

  // DEDUPE: check for existing pending alert with same (email, productId, variantId)
  const dedupeWhere = data.variantId
    ? and(
        eq(restockAlerts.email, email),
        eq(restockAlerts.productId, data.productId),
        eq(restockAlerts.variantId, data.variantId),
        eq(restockAlerts.status, "pending"),
      )
    : and(
        eq(restockAlerts.email, email),
        eq(restockAlerts.productId, data.productId),
        isNull(restockAlerts.variantId),
        eq(restockAlerts.status, "pending"),
      );

  const existing = await db
    .select()
    .from(restockAlerts)
    .where(dedupeWhere);

  if (existing.length > 0) {
    const row = existing[0];
    return { ok: true, alertId: row.id, cancelToken: row.cancelToken };
  }

  // INSERT new alert
  const id = crypto.randomUUID();
  const cancelToken = crypto.randomUUID();

  const inserted = await db
    .insert(restockAlerts)
    .values({
      id,
      email,
      userId,
      productId: data.productId,
      variantId: data.variantId ?? null,
      storeIds: data.storeIds ?? null,
      status: "pending",
      cancelToken,
    })
    .returning({ id: restockAlerts.id, cancelToken: restockAlerts.cancelToken });

  const row = inserted[0];

  if (user) {
    revalidatePath("/cuenta/alertas");
  }

  return { ok: true, alertId: row.id, cancelToken: row.cancelToken };
}

// ---------------------------------------------------------------------------
// cancelRestockAlert
// ---------------------------------------------------------------------------
export type CancelRestockAlertResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "already_canceled" | "forbidden" };

export async function cancelRestockAlert(
  input: unknown,
): Promise<CancelRestockAlertResult> {
  const parsed = cancelRestockAlertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "not_found" };
  }

  const data = parsed.data;

  if (data.kind === "id") {
    // Requires authenticated user
    const user = await requireUser();

    const rows = await db
      .select()
      .from(restockAlerts)
      .where(eq(restockAlerts.id, data.alertId));

    if (rows.length === 0) {
      return { ok: false, error: "not_found" };
    }

    const alert = rows[0];

    if (alert.userId !== user.id) {
      return { ok: false, error: "forbidden" };
    }

    if (alert.status !== "pending") {
      return { ok: false, error: "already_canceled" };
    }

    await db
      .update(restockAlerts)
      .set({ status: "canceled", canceledAt: new Date() })
      .where(eq(restockAlerts.id, alert.id));

    revalidatePath("/cuenta/alertas");
    revalidatePath("/alertas/cancelar");

    return { ok: true };
  }

  // kind === "token" — public/anonymous
  const rows = await db
    .select()
    .from(restockAlerts)
    .where(eq(restockAlerts.cancelToken, data.token));

  if (rows.length === 0) {
    return { ok: false, error: "not_found" };
  }

  const alert = rows[0];

  if (alert.status !== "pending") {
    return { ok: false, error: "already_canceled" };
  }

  await db
    .update(restockAlerts)
    .set({ status: "canceled", canceledAt: new Date() })
    .where(eq(restockAlerts.id, alert.id));

  revalidatePath("/cuenta/alertas");
  revalidatePath("/alertas/cancelar");

  return { ok: true };
}
