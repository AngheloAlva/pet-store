import { db, dbReady } from "@/db";
import { services } from "@/db/schema";
import { eq } from "drizzle-orm";

export type ServiceRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  requiresPet: boolean;
  species: string[];
  active: boolean;
};

export async function loadAllServices(): Promise<ServiceRow[]> {
  await dbReady;
  const rows = await db.select().from(services);
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    durationMin: r.durationMin,
    priceCents: r.priceCents,
    requiresPet: r.requiresPet,
    species: r.species,
    active: r.active,
  }));
}

export async function getServiceById(id: string): Promise<ServiceRow | null> {
  await dbReady;
  const rows = await db.select().from(services).where(eq(services.id, id));
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    durationMin: r.durationMin,
    priceCents: r.priceCents,
    requiresPet: r.requiresPet,
    species: r.species,
    active: r.active,
  };
}
