import type { InferInsertModel } from "drizzle-orm";
import { pets } from "@/db/schema";

type NewPet = InferInsertModel<typeof pets>;

// Fixed demo dates
const DEMO_NOW = new Date("2026-05-20T00:00:00.000Z");

export const seedPets: NewPet[] = [
  {
    id: "pet-tobi-camila",
    userId: "user-camila-demo",
    name: "Tobi",
    species: "dog",
    breed: "Golden Retriever",
    birthDate: "2021-03-12",
    weightKg: "28.50",
    notes: null,
    photoUrl: null,
    active: true,
    createdAt: DEMO_NOW,
    updatedAt: DEMO_NOW,
  },
];
