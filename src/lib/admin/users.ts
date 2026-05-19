/**
 * Admin user loaders — shaped for the admin UI.
 * TODO: add pagination if list exceeds 50 users.
 */
import { db, dbReady } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { loadAllStores } from "@/db/loaders";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  rut: string | null;
  phone: string | null;
  role: "customer" | "admin" | "staff";
  storeId: string | null;
  storeName: string | null;
  isDemoSeed: boolean;
  createdAt: string;
};

export type UserForEdit = {
  id: string;
  email: string;
  name: string;
  rut: string | null;
  phone: string | null;
  role: "customer" | "admin" | "staff";
  storeId: string | null;
  isDemoSeed: boolean;
};

// ---------------------------------------------------------------------------
// loadAdminUserRows
// ---------------------------------------------------------------------------
export async function loadAdminUserRows(): Promise<AdminUserRow[]> {
  await dbReady;

  const allStores = await loadAllStores();
  const storeMap = new Map(allStores.map((s) => [s.id, s.name]));

  const rows = await db.query.users.findMany();

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    rut: row.rut,
    phone: row.phone,
    role: row.role as "customer" | "admin" | "staff",
    storeId: row.storeId,
    storeName: row.storeId ? (storeMap.get(row.storeId) ?? null) : null,
    isDemoSeed: row.isDemoSeed,
    createdAt: row.createdAt,
  }));
}

// ---------------------------------------------------------------------------
// loadUserForEdit
// ---------------------------------------------------------------------------
export async function loadUserForEdit(
  id: string,
): Promise<UserForEdit | undefined> {
  await dbReady;

  const row = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!row) return undefined;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    rut: row.rut,
    phone: row.phone,
    role: row.role as "customer" | "admin" | "staff",
    storeId: row.storeId,
    isDemoSeed: row.isDemoSeed,
  };
}

export { loadAllStores };
