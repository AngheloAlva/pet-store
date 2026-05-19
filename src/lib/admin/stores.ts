/**
 * Admin store loaders — shaped for the admin UI.
 * TODO: add pagination if list exceeds 50 stores.
 */
import { db, dbReady } from "@/db";
import { stockLevels, stores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { storeScheduleSchema, type StoreSchedule } from "@/app/actions/admin/stores.schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type AdminStoreRow = {
  id: string;
  slug: string;
  name: string;
  commune: string;
  phone: string;
  servicesCount: number;
};

export type StoreForEdit = {
  id: string;
  slug: string;
  name: string;
  address: string;
  commune: string;
  phone: string;
  lat: string;
  lng: string;
  schedule: StoreSchedule;
  services: string[];
  reference: string | null;
};

// Default closed day shape for normalization
const DEFAULT_CLOSED = { closed: true as const };
const DEFAULT_OPEN = { open: "09:00", close: "18:00" };

function normalizeSchedule(raw: unknown): StoreSchedule {
  const result = storeScheduleSchema.safeParse(raw);
  if (result.success) return result.data;
  // Fallback: all days closed
  return {
    mon: DEFAULT_CLOSED,
    tue: DEFAULT_CLOSED,
    wed: DEFAULT_CLOSED,
    thu: DEFAULT_CLOSED,
    fri: DEFAULT_CLOSED,
    sat: DEFAULT_CLOSED,
    sun: DEFAULT_CLOSED,
  };
}

// ---------------------------------------------------------------------------
// loadAdminStoreRows
// ---------------------------------------------------------------------------
export async function loadAdminStoreRows(): Promise<AdminStoreRow[]> {
  await dbReady;

  const rows = await db.query.stores.findMany();

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    commune: row.commune,
    phone: row.phone,
    servicesCount: (row.services ?? []).length,
  }));
}

// ---------------------------------------------------------------------------
// loadStoreForEdit
// ---------------------------------------------------------------------------
export async function loadStoreForEdit(
  id: string,
): Promise<StoreForEdit | undefined> {
  await dbReady;

  const row = await db.query.stores.findFirst({
    where: eq(stores.id, id),
  });

  if (!row) return undefined;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    address: row.address,
    commune: row.commune,
    phone: row.phone,
    lat: row.lat,
    lng: row.lng,
    schedule: normalizeSchedule(row.schedule),
    services: row.services ?? [],
    reference: row.reference,
  };
}

// ---------------------------------------------------------------------------
// hasStockReferences
// ---------------------------------------------------------------------------
export async function hasStockReferences(id: string): Promise<boolean> {
  await dbReady;
  const rows = await db
    .select({ variantId: stockLevels.variantId })
    .from(stockLevels)
    .where(eq(stockLevels.storeId, id));
  return rows.length > 0;
}

export { DEFAULT_OPEN, DEFAULT_CLOSED };
