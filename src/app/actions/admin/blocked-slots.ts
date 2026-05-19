"use server";

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { blockedSlots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createBlockedSlotSchema, type ZodFlatError } from "./blocked-slots.schema";

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
// createBlockedSlot
// ---------------------------------------------------------------------------
export async function createBlockedSlot(
  input: unknown,
): Promise<{ ok: true; id: string } | { ok: false; errors: ZodFlatError }> {
  await requireAdmin();

  const parsed = createBlockedSlotSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten() };
  }

  const data = parsed.data;
  const id = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(blockedSlots).values({
      id,
      storeId: data.storeId,
      serviceId: data.serviceId ?? null,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      reason: data.reason ?? null,
    });
  });

  revalidatePath("/admin/horarios");

  return { ok: true, id };
}

// ---------------------------------------------------------------------------
// deleteBlockedSlot
// ---------------------------------------------------------------------------
export async function deleteBlockedSlot(
  id: string,
): Promise<{ ok: true } | { ok: false; errors: { formErrors: string[]; fieldErrors: Record<string, never> } }> {
  await requireAdmin();

  await db.delete(blockedSlots).where(eq(blockedSlots.id, id));

  revalidatePath("/admin/horarios");

  return { ok: true };
}
