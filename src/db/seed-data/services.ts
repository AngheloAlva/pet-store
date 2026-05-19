import type { InferInsertModel } from "drizzle-orm";
import { services } from "@/db/schema";

type NewService = InferInsertModel<typeof services>;

export const seedServices: NewService[] = [
  {
    id: "svc-bath-trim",
    slug: "bano-y-corte",
    name: "Baño y corte",
    description: "Baño profesional con secado y corte de pelo para tu mascota.",
    durationMin: 60,
    priceCents: 1500000, // $15.000 CLP
    requiresPet: false,
    species: ["dog", "cat"],
    active: true,
  },
  {
    id: "svc-vet-consult",
    slug: "consulta-veterinaria",
    name: "Consulta veterinaria",
    description: "Consulta general con veterinario titulado, incluye revisión completa.",
    durationMin: 30,
    priceCents: 2500000, // $25.000 CLP
    requiresPet: false,
    species: ["dog", "cat", "bird", "small_pet", "reptile"],
    active: true,
  },
  {
    id: "svc-meds-pickup",
    slug: "retiro-medicamentos",
    name: "Retiro de medicamentos",
    description: "Asesoría y entrega de medicamentos con receta veterinaria.",
    durationMin: 15,
    priceCents: 0,
    requiresPet: false,
    species: [],
    active: true,
  },
];
