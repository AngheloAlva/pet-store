import { z } from "zod";
import { SPECIES } from "@/db/schema";

// Spread the readonly const tuple into a mutable one for z.enum
const speciesEnum = z.enum([...SPECIES]);

// ---------------------------------------------------------------------------
// petSchema
// ---------------------------------------------------------------------------
export const petSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  name: z.string().min(1, { message: "El nombre es obligatorio" }),
  species: speciesEnum,
  breed: z.string().optional(),
  birthDate: z.string().optional(),
  weightKg: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
});

export const updatePetSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio" }),
  species: speciesEnum,
  breed: z.string().optional(),
  birthDate: z.string().optional(),
  weightKg: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
});

export type PetInput = z.infer<typeof petSchema>;
export type UpdatePetInput = z.infer<typeof updatePetSchema>;
