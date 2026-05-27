"use server";

/**
 * Address CRUD actions — F3.4
 * All *WithDb functions accept a database injection for testability (PGlite).
 * Thin no-arg server-action wrappers call getCurrentUser() then delegate.
 */
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { userAddresses } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { isCovered } from "@/lib/checkout/communes";
import { revalidatePath } from "next/cache";
import { addressInputSchema, type AddressInput } from "./direcciones.schema";
import { randomUUID } from "node:crypto";

type AnyDb = typeof db;

export type AddressResult =
  | { ok: true; addressId: string }
  | {
      ok: false;
      code:
        | "UNAUTHENTICATED"
        | "NOT_FOUND"
        | "COMMUNE_NOT_COVERED"
        | "VALIDATION"
        | "FORBIDDEN";
      message?: string;
    };

export type MutationResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "UNAUTHENTICATED"
        | "NOT_FOUND"
        | "COMMUNE_NOT_COVERED"
        | "VALIDATION"
        | "FORBIDDEN";
      message?: string;
    };

// ---------------------------------------------------------------------------
// listAddressesWithDb
// ---------------------------------------------------------------------------
export async function listAddressesWithDb(
  database: AnyDb,
  userId: string,
) {
  return database
    .select()
    .from(userAddresses)
    .where(eq(userAddresses.userId, userId))
    .orderBy(asc(userAddresses.createdAt));
}

export async function listAddresses() {
  const user = await getCurrentUser();
  if (!user) return [];
  return listAddressesWithDb(db, user.id);
}

// ---------------------------------------------------------------------------
// createAddressWithDb
// ---------------------------------------------------------------------------
export async function createAddressWithDb(
  database: AnyDb,
  userId: string,
  input: AddressInput,
): Promise<AddressResult> {
  const parsed = addressInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION", message: JSON.stringify(parsed.error.flatten()) };
  }

  const data = parsed.data;

  if (!isCovered(data.commune)) {
    return { ok: false, code: "COMMUNE_NOT_COVERED" };
  }

  // Check if this user already has addresses (to decide isDefault)
  const existing = await database
    .select({ id: userAddresses.id })
    .from(userAddresses)
    .where(eq(userAddresses.userId, userId));

  const isDefault = existing.length === 0;
  const id = randomUUID();
  const now = new Date();

  await database.insert(userAddresses).values({
    id,
    userId,
    label: data.label,
    name: data.name,
    street: data.street,
    commune: data.commune,
    region: data.region,
    phone: data.phone,
    notes: data.notes ?? null,
    isDefault,
    createdAt: now,
    updatedAt: now,
  });

  return { ok: true, addressId: id };
}

export async function createAddress(input: AddressInput): Promise<AddressResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };
  const result = await createAddressWithDb(db, user.id, input);
  if (result.ok) revalidatePath("/cuenta/direcciones");
  return result;
}

// ---------------------------------------------------------------------------
// updateAddressWithDb
// ---------------------------------------------------------------------------
export async function updateAddressWithDb(
  database: AnyDb,
  userId: string,
  addressId: string,
  input: AddressInput,
): Promise<MutationResult> {
  const parsed = addressInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION", message: JSON.stringify(parsed.error.flatten()) };
  }

  const data = parsed.data;

  if (!isCovered(data.commune)) {
    return { ok: false, code: "COMMUNE_NOT_COVERED" };
  }

  // Ownership check
  const rows = await database
    .select({ id: userAddresses.id })
    .from(userAddresses)
    .where(and(eq(userAddresses.id, addressId), eq(userAddresses.userId, userId)));

  if (rows.length === 0) return { ok: false, code: "NOT_FOUND" };

  await database
    .update(userAddresses)
    .set({
      label: data.label,
      name: data.name,
      street: data.street,
      commune: data.commune,
      region: data.region,
      phone: data.phone,
      notes: data.notes ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(userAddresses.id, addressId), eq(userAddresses.userId, userId)));

  return { ok: true };
}

export async function updateAddress(
  addressId: string,
  input: AddressInput,
): Promise<MutationResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };
  const result = await updateAddressWithDb(db, user.id, addressId, input);
  if (result.ok) revalidatePath("/cuenta/direcciones");
  return result;
}

// ---------------------------------------------------------------------------
// setDefaultAddressWithDb — tx: unset all + set target
// ---------------------------------------------------------------------------
export async function setDefaultAddressWithDb(
  database: AnyDb,
  userId: string,
  addressId: string,
): Promise<MutationResult> {
  // Ownership check
  const rows = await database
    .select({ id: userAddresses.id })
    .from(userAddresses)
    .where(and(eq(userAddresses.id, addressId), eq(userAddresses.userId, userId)));

  if (rows.length === 0) return { ok: false, code: "NOT_FOUND" };

  await database.transaction(async (tx) => {
    // Unset all defaults for this user
    await tx
      .update(userAddresses)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(userAddresses.userId, userId));

    // Set target as default
    await tx
      .update(userAddresses)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(eq(userAddresses.id, addressId), eq(userAddresses.userId, userId)));
  });

  return { ok: true };
}

export async function setDefaultAddress(addressId: string): Promise<MutationResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };
  const result = await setDefaultAddressWithDb(db, user.id, addressId);
  if (result.ok) revalidatePath("/cuenta/direcciones");
  return result;
}

// ---------------------------------------------------------------------------
// deleteAddressWithDb — tx: delete + auto-promote oldest remaining
// ---------------------------------------------------------------------------
export async function deleteAddressWithDb(
  database: AnyDb,
  userId: string,
  addressId: string,
): Promise<MutationResult> {
  // Ownership check + get isDefault status
  const rows = await database
    .select({ id: userAddresses.id, isDefault: userAddresses.isDefault })
    .from(userAddresses)
    .where(and(eq(userAddresses.id, addressId), eq(userAddresses.userId, userId)));

  if (rows.length === 0) return { ok: false, code: "NOT_FOUND" };

  const wasDefault = rows[0].isDefault;

  await database.transaction(async (tx) => {
    // Delete the address
    await tx
      .delete(userAddresses)
      .where(and(eq(userAddresses.id, addressId), eq(userAddresses.userId, userId)));

    // If it was the default, promote oldest remaining
    if (wasDefault) {
      const remaining = await tx
        .select({ id: userAddresses.id })
        .from(userAddresses)
        .where(eq(userAddresses.userId, userId))
        .orderBy(asc(userAddresses.createdAt))
        .limit(1);

      if (remaining.length > 0) {
        await tx
          .update(userAddresses)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(eq(userAddresses.id, remaining[0].id));
      }
    }
  });

  return { ok: true };
}

export async function deleteAddress(addressId: string): Promise<MutationResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };
  const result = await deleteAddressWithDb(db, user.id, addressId);
  if (result.ok) revalidatePath("/cuenta/direcciones");
  return result;
}
