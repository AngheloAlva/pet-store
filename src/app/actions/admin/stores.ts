"use server";

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { stores, stockLevels } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createStoreSchema,
  updateStoreSchema,
  type ZodFlatError,
} from "./stores.schema";

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
// createStore
// ---------------------------------------------------------------------------
export async function createStore(
  input: unknown,
): Promise<{ ok: true; id: string } | { ok: false; errors: ZodFlatError }> {
  await requireAdmin();

  const parsed = createStoreSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten() };
  }

  const data = parsed.data;
  const id = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(stores).values({
      id,
      slug: data.slug,
      name: data.name,
      address: data.address,
      commune: data.commune,
      phone: data.phone,
      lat: String(data.lat),
      lng: String(data.lng),
      schedule: data.schedule,
      services: data.services,
      reference: data.reference ?? null,
    });
  });

  revalidatePath("/admin/sucursales");
  // TODO: revalidate public store pages when non-demo mode is active

  return { ok: true, id };
}

// ---------------------------------------------------------------------------
// updateStore
// ---------------------------------------------------------------------------
export async function updateStore(
  id: string,
  input: unknown,
): Promise<{ ok: true } | { ok: false; errors: ZodFlatError }> {
  await requireAdmin();

  const parsed = updateStoreSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten() };
  }

  const data = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .update(stores)
      .set({
        slug: data.slug,
        name: data.name,
        address: data.address,
        commune: data.commune,
        phone: data.phone,
        lat: String(data.lat),
        lng: String(data.lng),
        schedule: data.schedule,
        services: data.services,
        reference: data.reference ?? null,
      })
      .where(eq(stores.id, id));
  });

  revalidatePath("/admin/sucursales");
  revalidatePath(`/admin/sucursales/${id}/editar`, "page");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// deleteStore
// ---------------------------------------------------------------------------
export async function deleteStore(
  id: string,
): Promise<{ ok: true } | { ok: false; errors: { formErrors: string[]; fieldErrors: Record<string, never> } }> {
  await requireAdmin();

  const result = await db.transaction(async (tx) => {
    // Check if any stock_levels reference this store (R14)
    const stock = await tx
      .select({ variantId: stockLevels.variantId })
      .from(stockLevels)
      .where(eq(stockLevels.storeId, id));

    if (stock.length > 0) {
      return {
        ok: false as const,
        errors: {
          formErrors: [
            "No se puede eliminar: la sucursal tiene stock asociado",
          ],
          fieldErrors: {} as Record<string, never>,
        },
      };
    }

    await tx.delete(stores).where(eq(stores.id, id));
    return { ok: true as const };
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/admin/sucursales");

  return { ok: true };
}
