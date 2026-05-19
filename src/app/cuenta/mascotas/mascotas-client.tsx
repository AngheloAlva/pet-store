"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PetForm } from "@/components/pets/pet-form";
import { deletePet } from "@/app/actions/pets";
import { useRouter } from "next/navigation";
import type { OwnPet } from "@/lib/pets";

// ---------------------------------------------------------------------------
// Species display helpers
// ---------------------------------------------------------------------------
const SPECIES_EMOJI: Record<string, string> = {
  dog: "🐕",
  cat: "🐈",
  exotic: "🦜",
};

const SPECIES_LABELS: Record<string, string> = {
  dog: "Perro",
  cat: "Gato",
  exotic: "Exótico",
};

function getAge(birthDate: string | null): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  const adjustedYears =
    months < 0 || (months === 0 && now.getDate() < birth.getDate())
      ? years - 1
      : years;
  return adjustedYears <= 0 ? "< 1 año" : `${adjustedYears} año${adjustedYears !== 1 ? "s" : ""}`;
}

// ---------------------------------------------------------------------------
// PetCard
// ---------------------------------------------------------------------------
function PetCard({ pet, userId }: { pet: OwnPet; userId: string }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleDelete() {
    await deletePet(pet.id);
    setDeleteOpen(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-4xl">{SPECIES_EMOJI[pet.species] ?? "🐾"}</span>
        <div>
          <h3 className="text-lg font-semibold">{pet.name}</h3>
          <p className="text-sm text-muted-foreground">
            {SPECIES_LABELS[pet.species] ?? pet.species}
            {pet.breed ? ` · ${pet.breed}` : ""}
          </p>
          {pet.birthDate && (
            <p className="text-xs text-muted-foreground">{getAge(pet.birthDate)}</p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {/* Edit */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger
            render={<Button variant="outline" size="sm" />}
          >
            Editar
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar mascota</DialogTitle>
            </DialogHeader>
            <PetForm
              mode="client"
              userId={userId}
              petId={pet.id}
              defaultValues={{
                name: pet.name,
                species: pet.species,
                breed: pet.breed ?? "",
                birthDate: pet.birthDate ?? "",
                weightKg: pet.weightKg ?? "",
                notes: pet.notes ?? "",
              }}
              onSuccess={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Delete */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger
            render={<Button variant="destructive" size="sm" />}
          >
            Eliminar
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar mascota</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              ¿Estás seguro que querés eliminar a{" "}
              <span className="font-semibold">{pet.name}</span>? Esta acción no
              se puede deshacer.
            </p>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Eliminar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MascotasClient
// ---------------------------------------------------------------------------
export function MascotasClient({ pets, userId }: { pets: OwnPet[]; userId: string }) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis mascotas</h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button />}>
            Agregar mascota
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva mascota</DialogTitle>
            </DialogHeader>
            <PetForm
              mode="client"
              userId={userId}
              onSuccess={() => setAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {pets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-6xl mb-4">🐾</span>
          <h2 className="text-xl font-semibold mb-2">Sin mascotas registradas</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Agregá tu primera mascota para acceder a beneficios especiales.
          </p>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger render={<Button />}>
              Agregar tu primera mascota
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva mascota</DialogTitle>
              </DialogHeader>
              <PetForm
                mode="client"
                userId={userId}
                onSuccess={() => setAddOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pets.map((pet) => (
            <PetCard key={pet.id} pet={pet} userId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}
