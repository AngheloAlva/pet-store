"use server";

/**
 * Admin settings actions — F3.2b
 * getAppSettings: reads/creates the singleton app_settings row.
 * updateFailureMode: admin action to toggle paymentFailureMode.
 */
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

type AnyDb = typeof db;

export interface AppSettings {
  paymentFailureMode: boolean;
}

export type UpdateFailureModeResult =
  | { ok: true }
  | { ok: false; code: "UNAUTHENTICATED" | "FORBIDDEN" };

export async function getAppSettingsWithDb(database: AnyDb): Promise<AppSettings> {
  // Try to get existing singleton
  const rows = await database
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, "singleton"));

  if (rows.length > 0) {
    return { paymentFailureMode: rows[0].paymentFailureMode };
  }

  // Upsert singleton with defaults
  await database
    .insert(appSettings)
    .values({ id: "singleton", paymentFailureMode: false })
    .onConflictDoNothing();

  // Re-fetch after upsert
  const afterUpsert = await database
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, "singleton"));

  if (afterUpsert.length > 0) {
    return { paymentFailureMode: afterUpsert[0].paymentFailureMode };
  }

  return { paymentFailureMode: false };
}

export async function getAppSettings(): Promise<AppSettings> {
  return getAppSettingsWithDb(db);
}

export async function updateFailureModeWithDb(
  database: AnyDb,
  enabled: boolean,
  userId: string,
): Promise<UpdateFailureModeResult> {
  // Check admin role in db
  const { users } = await import("@/db/schema");
  const userRows = await database
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId));

  if (userRows.length === 0 || userRows[0].role !== "admin") {
    return { ok: false, code: "FORBIDDEN" };
  }

  await database
    .insert(appSettings)
    .values({ id: "singleton", paymentFailureMode: enabled })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: { paymentFailureMode: enabled, updatedAt: new Date() },
    });

  return { ok: true };
}

export async function updateFailureMode(enabled: boolean): Promise<UpdateFailureModeResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };
  if (user.role !== "admin") return { ok: false, code: "FORBIDDEN" };

  return updateFailureModeWithDb(db, enabled, user.id);
}
