"use server";

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { services, appointments } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createServiceSchema,
  updateServiceSchema,
  type ZodFlatError,
} from "./services.schema";

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
// createService
// ---------------------------------------------------------------------------
export async function createService(
  input: unknown,
): Promise<{ ok: true; id: string } | { ok: false; errors: ZodFlatError }> {
  await requireAdmin();

  const parsed = createServiceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten() };
  }

  const data = parsed.data;
  const id = crypto.randomUUID();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(services).values({
        id,
        slug: data.slug,
        name: data.name,
        description: data.description ?? null,
        durationMin: data.durationMin,
        priceCents: data.priceCents,
        requiresPet: data.requiresPet ?? false,
        species: data.species ?? [],
        active: data.active ?? true,
      });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("unique") || (err as { code?: string }).code === "23505") {
      return {
        ok: false,
        errors: {
          formErrors: ["El slug ya existe. Usa un slug diferente."],
          fieldErrors: {},
        },
      };
    }
    throw err;
  }

  revalidatePath("/admin/servicios");

  return { ok: true, id };
}

// ---------------------------------------------------------------------------
// updateService
// ---------------------------------------------------------------------------
export async function updateService(
  id: string,
  input: unknown,
): Promise<{ ok: true } | { ok: false; errors: ZodFlatError }> {
  await requireAdmin();

  const parsed = updateServiceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten() };
  }

  const data = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .update(services)
      .set({
        slug: data.slug,
        name: data.name,
        description: data.description ?? null,
        durationMin: data.durationMin,
        priceCents: data.priceCents,
        requiresPet: data.requiresPet ?? false,
        species: data.species ?? [],
        active: data.active ?? true,
      })
      .where(eq(services.id, id));
  });

  revalidatePath("/admin/servicios");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// deleteService — S-ACTION-2: blocked by existing appointments
// ---------------------------------------------------------------------------
export async function deleteService(
  id: string,
): Promise<
  { ok: true } | { ok: false; errors: { formErrors: string[]; fieldErrors: Record<string, never> } }
> {
  await requireAdmin();

  const result = await db.transaction(async (tx) => {
    const linked = await tx
      .select({ id: appointments.id })
      .from(appointments)
      .where(eq(appointments.serviceId, id));

    if (linked.length > 0) {
      return {
        ok: false as const,
        errors: {
          formErrors: [
            "No se puede eliminar: el servicio tiene citas asociadas",
          ],
          fieldErrors: {} as Record<string, never>,
        },
      };
    }

    await tx.delete(services).where(eq(services.id, id));
    return { ok: true as const };
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/admin/servicios");

  return { ok: true };
}
