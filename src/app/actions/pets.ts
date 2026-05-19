"use server";

import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { pets } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { petSchema, updatePetSchema, type UpdatePetInput } from "./pets.schema";

// ---------------------------------------------------------------------------
// createPet — client-facing; user can only create pets for themselves
// ---------------------------------------------------------------------------
export async function createPet(
  input: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Authentication required" };
  }

  const parsed = petSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  const data = parsed.data;

  // Only allow creating pet for self unless admin
  if (data.userId !== user.id && user.role !== "admin") {
    return { ok: false, error: "Authentication required: cannot create pets for other users" };
  }

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

  revalidatePath("/cuenta/mascotas");

  return { ok: true, id };
}

// ---------------------------------------------------------------------------
// updatePet — client-facing; user can only update their own pets
// ---------------------------------------------------------------------------
export async function updatePet(
  id: string,
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Authentication required" };
  }

  // Verify ownership
  const existing = await db
    .select({ userId: pets.userId })
    .from(pets)
    .where(eq(pets.id, id));

  if (existing.length === 0) {
    return { ok: false, error: "Pet not found" };
  }

  if (existing[0].userId !== user.id && user.role !== "admin") {
    return { ok: false, error: "Authentication required: cannot update pets for other users" };
  }

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

  revalidatePath("/cuenta/mascotas");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// deletePet — SOFT delete only (active=false). Hard DELETE is PROHIBITED.
// ---------------------------------------------------------------------------
export async function deletePet(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Authentication required" };
  }

  // Verify ownership
  const existing = await db
    .select({ userId: pets.userId, active: pets.active })
    .from(pets)
    .where(eq(pets.id, id));

  if (existing.length === 0) {
    return { ok: false, error: "Pet not found" };
  }

  if (existing[0].userId !== user.id && user.role !== "admin") {
    return { ok: false, error: "Authentication required: cannot delete pets for other users" };
  }

  // Soft delete — set active=false, never hard DELETE
  await db
    .update(pets)
    .set({ active: false })
    .where(and(eq(pets.id, id)));

  revalidatePath("/cuenta/mascotas");

  return { ok: true };
}
