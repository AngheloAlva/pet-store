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
  // F3.3 — shipping settings
  coveredCommunes: string[] | null;
  freeShippingThreshold: number | null;
  dispatchSlots: string[] | null;
}

export type UpdateFailureModeResult =
  | { ok: true }
  | { ok: false; code: "UNAUTHENTICATED" | "FORBIDDEN" };

export async function getAppSettingsWithDb(database: AnyDb): Promise<AppSettings> {
  // Try to get existing singleton
  try {
    const rows = await database
      .select()
      .from(appSettings)
      .where(eq(appSettings.id, "singleton"));

    if (rows.length > 0) {
      return {
        paymentFailureMode: rows[0].paymentFailureMode,
        coveredCommunes: rows[0].coveredCommunes ?? null,
        freeShippingThreshold: rows[0].freeShippingThreshold ?? null,
        dispatchSlots: rows[0].dispatchSlots ?? null,
      };
    }

    // Insert default singleton (INSERT ... ON CONFLICT DO NOTHING via try/catch)
    try {
      await database
        .insert(appSettings)
        .values({ id: "singleton", paymentFailureMode: false });
    } catch {
      // Row already exists — concurrent insert, just re-read
    }

    // Re-fetch after insert
    const afterInsert = await database
      .select()
      .from(appSettings)
      .where(eq(appSettings.id, "singleton"));

    if (afterInsert.length > 0) {
      return {
        paymentFailureMode: afterInsert[0].paymentFailureMode,
        coveredCommunes: afterInsert[0].coveredCommunes ?? null,
        freeShippingThreshold: afterInsert[0].freeShippingThreshold ?? null,
        dispatchSlots: afterInsert[0].dispatchSlots ?? null,
      };
    }
  } catch (err) {
    // Only swallow "table does not exist" — older test DBs without the migration.
    // Real query errors must surface.
    if (err instanceof Error && /relation .* does not exist|no such table/i.test(err.message)) {
      return { paymentFailureMode: false, coveredCommunes: null, freeShippingThreshold: null, dispatchSlots: null };
    }
    throw err;
  }

  return { paymentFailureMode: false, coveredCommunes: null, freeShippingThreshold: null, dispatchSlots: null };
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

// ---------------------------------------------------------------------------
// Cobertura settings (F3.3)
// ---------------------------------------------------------------------------

export interface CoberturaSettingsInput {
  coveredCommunes: string[];
  freeShippingThreshold: number;
  dispatchSlots: string[];
}

export type UpdateCoberturaResult =
  | { ok: true }
  | { ok: false; code: "UNAUTHENTICATED" | "FORBIDDEN" | "VALIDATION_ERROR"; message?: string };

export async function updateCoberturaSettingsWithDb(
  database: AnyDb,
  userId: string,
  input: CoberturaSettingsInput,
): Promise<UpdateCoberturaResult> {
  // Check admin role
  const { users } = await import("@/db/schema");
  const userRows = await database
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId));

  if (userRows.length === 0 || userRows[0].role !== "admin") {
    return { ok: false, code: "FORBIDDEN" };
  }

  // Validate threshold
  if (input.freeShippingThreshold <= 0) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "freeShippingThreshold must be a positive number",
    };
  }

  await database
    .insert(appSettings)
    .values({
      id: "singleton",
      paymentFailureMode: false,
      coveredCommunes: input.coveredCommunes,
      freeShippingThreshold: input.freeShippingThreshold,
      dispatchSlots: input.dispatchSlots,
    })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: {
        coveredCommunes: input.coveredCommunes,
        freeShippingThreshold: input.freeShippingThreshold,
        dispatchSlots: input.dispatchSlots,
        updatedAt: new Date(),
      },
    });

  return { ok: true };
}

export async function updateCoberturaSettings(
  input: CoberturaSettingsInput,
): Promise<UpdateCoberturaResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };
  if (user.role !== "admin") return { ok: false, code: "FORBIDDEN" };

  return updateCoberturaSettingsWithDb(db, user.id, input);
}
