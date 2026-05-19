"use server";

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  updateUserIdentitySchema,
  type ZodFlatError,
} from "./users.schema";

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
// updateUserIdentity
// ---------------------------------------------------------------------------
export async function updateUserIdentity(
  id: string,
  input: unknown,
): Promise<{ ok: true } | { ok: false; errors: ZodFlatError }> {
  await requireAdmin();

  const parsed = updateUserIdentitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten() };
  }

  const data = parsed.data;

  const result = await db.transaction(async (tx) => {
    // Fetch user first — check demo-seed guard
    const existing = await tx
      .select({ id: users.id, isDemoSeed: users.isDemoSeed })
      .from(users)
      .where(eq(users.id, id));

    if (existing.length === 0) {
      return {
        ok: false as const,
        errors: {
          formErrors: ["Usuario no encontrado"],
          fieldErrors: {} as Record<string, never>,
        },
      };
    }

    if (existing[0].isDemoSeed) {
      return {
        ok: false as const,
        errors: {
          formErrors: ["No se puede editar un usuario demo"],
          fieldErrors: {} as Record<string, never>,
        },
      };
    }

    await tx
      .update(users)
      .set({
        name: data.name,
        email: data.email,
        rut: data.rut ?? null,
        phone: data.phone ?? null,
        role: data.role,
        storeId: data.storeId ?? null,
      })
      .where(eq(users.id, id));

    return { ok: true as const };
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${id}`, "page");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// deleteUser
// ---------------------------------------------------------------------------
export async function deleteUser(
  id: string,
): Promise<{ ok: true } | { ok: false; errors: { formErrors: string[]; fieldErrors: Record<string, never> } }> {
  await requireAdmin();

  const result = await db.transaction(async (tx) => {
    // Fetch user first — check demo-seed guard
    const existing = await tx
      .select({ id: users.id, isDemoSeed: users.isDemoSeed })
      .from(users)
      .where(eq(users.id, id));

    if (existing.length === 0) {
      return {
        ok: false as const,
        errors: {
          formErrors: ["Usuario no encontrado"],
          fieldErrors: {} as Record<string, never>,
        },
      };
    }

    if (existing[0].isDemoSeed) {
      return {
        ok: false as const,
        errors: {
          formErrors: ["No se puede eliminar un usuario demo"],
          fieldErrors: {} as Record<string, never>,
        },
      };
    }

    await tx.delete(users).where(eq(users.id, id));
    return { ok: true as const };
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/admin/usuarios");

  return { ok: true };
}
