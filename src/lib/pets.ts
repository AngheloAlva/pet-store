import { db, dbReady } from "@/db";
import { pets } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type OwnPet = {
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
// getOwnPets — returns active pets for the authenticated user
// ---------------------------------------------------------------------------
export async function getOwnPets(userId: string): Promise<OwnPet[]> {
  await dbReady;

  return db
    .select()
    .from(pets)
    .where(and(eq(pets.userId, userId), eq(pets.active, true)));
}
