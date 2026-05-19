import { db, dbReady } from "@/db";
import { pets } from "@/db/schema";
import { and, eq, like, or, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type PetRow = {
  id: string;
  userId: string;
  name: string;
  species: string;
  breed: string | null;
  birthDate: string | null;
  weightKg: string | null;
  notes: string | null;
  photoUrl: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// ---------------------------------------------------------------------------
// getUserPets — active pets for a specific user
// ---------------------------------------------------------------------------
export async function getUserPets(userId: string): Promise<PetRow[]> {
  await dbReady;

  return db
    .select()
    .from(pets)
    .where(and(eq(pets.userId, userId), eq(pets.active, true)));
}

// ---------------------------------------------------------------------------
// getAllPets — admin view: all pets (active + inactive), optional filters
// ---------------------------------------------------------------------------
export async function getAllPets(opts: {
  search?: string;
  species?: string;
}): Promise<PetRow[]> {
  await dbReady;

  const conditions = [];

  if (opts.species) {
    conditions.push(eq(pets.species, opts.species));
  }

  if (opts.search) {
    const pattern = `%${opts.search}%`;
    conditions.push(
      or(
        like(pets.name, pattern),
        like(pets.breed, pattern),
      ),
    );
  }

  if (conditions.length === 0) {
    return db.select().from(pets).where(sql`1=1`);
  }

  return db.select().from(pets).where(and(...conditions));
}

// ---------------------------------------------------------------------------
// getPetsWithBirthdayInMonth — uses SQL EXTRACT for birthDate text field
// ---------------------------------------------------------------------------
export async function getPetsWithBirthdayInMonth(month: number): Promise<PetRow[]> {
  await dbReady;

  return db
    .select()
    .from(pets)
    .where(
      and(
        eq(pets.active, true),
        sql`EXTRACT(MONTH FROM (${pets.birthDate})::date) = ${month}`,
      ),
    );
}
