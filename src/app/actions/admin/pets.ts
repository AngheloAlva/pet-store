"use server";

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { pets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { petSchema, updatePetSchema, type UpdatePetInput } from "@/app/actions/pets.schema";

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
// createPet (admin) — can create for any userId
// ---------------------------------------------------------------------------
export async function createPet(
  input: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireAdmin();

  const parsed = petSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  const data = parsed.data;
  const id = `pet-${crypto.randomUUID()}`;

  await db.insert(pets).values({
    id,
    userId: data.userId,
    name: data.name,
    species: data.species,
    breed: data.breed ?? null,
    birthDate: data.birthDate ?? null,
    weightKg: data.weightKg ?? null,
    notes: data.notes ?? null,
    photoUrl: data.photoUrl ?? null,
    active: true,
  });

  revalidatePath("/admin/mascotas");

  return { ok: true, id };
}

// ---------------------------------------------------------------------------
// updatePet (admin) — can edit any pet regardless of userId
// ---------------------------------------------------------------------------
export async function updatePet(
  id: string,
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  const parsed = updatePetSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  const data: UpdatePetInput = parsed.data;

  await db
    .update(pets)
    .set({
      name: data.name,
      species: data.species,
      breed: data.breed ?? null,
      birthDate: data.birthDate ?? null,
      weightKg: data.weightKg ?? null,
      notes: data.notes ?? null,
      photoUrl: data.photoUrl ?? null,
    })
    .where(eq(pets.id, id));

  revalidatePath("/admin/mascotas");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// deletePet (admin) — SOFT delete only (active=false)
// ---------------------------------------------------------------------------
export async function deletePet(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  // Soft delete — set active=false, NEVER hard DELETE
  await db
    .update(pets)
    .set({ active: false })
    .where(eq(pets.id, id));

  revalidatePath("/admin/mascotas");

  return { ok: true };
}
