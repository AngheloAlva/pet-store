"use server";

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { scheduleConfigs } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createScheduleConfigSchema,
  updateScheduleConfigSchema,
  type ZodFlatError,
} from "./schedule-configs.schema";

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/");
  }
  return user;
}

// ---------------------------------------------------------------------------
// createScheduleConfig
// ---------------------------------------------------------------------------
export async function createScheduleConfig(
  input: unknown,
): Promise<{ ok: true; id: string } | { ok: false; errors: ZodFlatError }> {
  await requireAdmin();

  const parsed = createScheduleConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten() };
  }

  const data = parsed.data;
  const id = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(scheduleConfigs).values({
      id,
      storeId: data.storeId,
      serviceId: data.serviceId ?? null,
      weekday: data.weekday,
      startHHMM: data.startHHMM,
      endHHMM: data.endHHMM,
      slotMinutes: data.slotMinutes,
      active: data.active ?? true,
    });
  });

  revalidatePath("/admin/horarios");

  return { ok: true, id };
}

// ---------------------------------------------------------------------------
// updateScheduleConfig
// ---------------------------------------------------------------------------
export async function updateScheduleConfig(
  id: string,
  input: unknown,
): Promise<{ ok: true } | { ok: false; errors: ZodFlatError }> {
  await requireAdmin();

  const parsed = updateScheduleConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten() };
  }

  const data = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .update(scheduleConfigs)
      .set({
        storeId: data.storeId,
        serviceId: data.serviceId ?? null,
        weekday: data.weekday,
        startHHMM: data.startHHMM,
        endHHMM: data.endHHMM,
        slotMinutes: data.slotMinutes,
        active: data.active ?? true,
      })
      .where(eq(scheduleConfigs.id, id));
  });

  revalidatePath("/admin/horarios");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// deleteScheduleConfig
// ---------------------------------------------------------------------------
export async function deleteScheduleConfig(
  id: string,
): Promise<{ ok: true } | { ok: false; errors: { formErrors: string[]; fieldErrors: Record<string, never> } }> {
  await requireAdmin();

  await db.delete(scheduleConfigs).where(eq(scheduleConfigs.id, id));

  revalidatePath("/admin/horarios");

  return { ok: true };
}
