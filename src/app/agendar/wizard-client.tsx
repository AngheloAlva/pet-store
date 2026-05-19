"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { createAppointment } from "@/app/actions/appointments";
import type { ServiceRow } from "@/lib/admin/services";
import type { Store } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Props {
  allServices: ServiceRow[];
  allStores: Store[];
  serviceParam?: string;
  storeParam?: string;
  dateParam?: string;
  slotParam?: string;
  userEmail: string;
}

// ---------------------------------------------------------------------------
// AgendarWizard — URL param driven, no client state for step progression
// ---------------------------------------------------------------------------
export function AgendarWizard({
  allServices,
  allStores,
  serviceParam,
  storeParam,
  dateParam,
  slotParam,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const selectedService = allServices.find((s) => s.id === serviceParam);
  const selectedStore = allStores.find((s) => s.id === storeParam);

  // ---------------------------------------------------------------------------
  // Step 4: Confirmation — all params present
  // ---------------------------------------------------------------------------
  if (serviceParam && storeParam && dateParam && slotParam) {
    async function handleConfirm() {
      startTransition(async () => {
        const result = await createAppointment({
          serviceId: serviceParam,
          storeId: storeParam,
          startsAt: slotParam,
        });
        if (!result.ok) {
          const error = "error" in result ? result.error : "validation_error";
          if (error === "slot_unavailable") {
            toast.error("El slot ya no está disponible. Por favor elige otro horario.");
          } else {
            toast.error("Error al crear la cita. Intenta de nuevo.");
          }
        } else {
          toast.success("¡Cita agendada con éxito!");
          router.push("/cuenta/citas");
        }
      });
    }

    const slotDate = new Date(slotParam);

    return (
      <div className="space-y-6 max-w-lg">
        <h2 className="text-xl font-semibold">Confirmar cita</h2>
        <div className="rounded-lg border p-6 space-y-3">
          <p>
            <span className="font-medium">Servicio:</span>{" "}
            {selectedService?.name ?? serviceParam}
          </p>
          <p>
            <span className="font-medium">Sucursal:</span>{" "}
            {selectedStore?.name ?? storeParam}
          </p>
          <p>
            <span className="font-medium">Fecha y hora:</span>{" "}
            {slotDate.toLocaleString("es-CL", {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </p>
        </div>
        <button
          onClick={handleConfirm}
          className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground font-medium hover:bg-primary/90"
        >
          Confirmar reserva
        </button>
        <button
          onClick={() => router.back()}
          className="w-full rounded-md border px-4 py-2 font-medium hover:bg-muted"
        >
          Cambiar horario
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step 3: Date + Slot selection — service and store present
  // ---------------------------------------------------------------------------
  if (serviceParam && storeParam) {
    const dates = getNextWeekdays();

    function handleDateSelect(date: string) {
      router.push(`/agendar?service=${serviceParam}&store=${storeParam}&date=${date}`);
    }

    function handleSlotSelect(slot: string) {
      router.push(
        `/agendar?service=${serviceParam}&store=${storeParam}&date=${dateParam ?? slot.split("T")[0]}&slot=${encodeURIComponent(slot)}`,
      );
    }

    // Generate demo slots if date is selected
    const slots = dateParam && selectedService
      ? generateDemoSlots(dateParam, selectedService.durationMin)
      : [];

    return (
      <div className="space-y-6 max-w-lg">
        <h2 className="text-xl font-semibold">Elige una fecha y horario</h2>
        <div className="grid grid-cols-4 gap-2">
          {dates.map((d) => (
            <button
              key={d.iso}
              onClick={() => handleDateSelect(d.iso)}
              className={`rounded-md border px-3 py-2 text-sm font-medium hover:bg-primary hover:text-primary-foreground ${
                dateParam === d.iso ? "bg-primary text-primary-foreground" : ""
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        {dateParam && slots.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {slots.map((slot) => (
              <button
                key={slot}
                onClick={() => handleSlotSelect(slot)}
                className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-primary hover:text-primary-foreground"
              >
                {new Date(slot).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
              </button>
            ))}
          </div>
        )}
        {dateParam && slots.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No hay horarios disponibles para este día.
          </p>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step 2: Store selection — service present but no store
  // ---------------------------------------------------------------------------
  if (serviceParam) {
    return (
      <div className="space-y-6 max-w-lg">
        <h2 className="text-xl font-semibold">Elige una sucursal</h2>
        <div className="grid gap-3">
          {allStores.map((store) => (
            <button
              key={store.id}
              onClick={() =>
                router.push(`/agendar?service=${serviceParam}&store=${store.id}`)
              }
              className="flex items-start gap-4 rounded-lg border p-4 text-left hover:border-primary hover:bg-muted/50"
            >
              <div>
                <p className="font-semibold">{store.name}</p>
                <p className="text-sm text-muted-foreground">{store.address}, {store.commune}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step 1: Service selection
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-xl font-semibold">Elige un servicio</h2>
      <div className="grid gap-3">
        {allServices
          .filter((s) => s.active)
          .map((svc) => (
            <button
              key={svc.id}
              onClick={() => router.push(`/agendar?service=${svc.id}`)}
              className="flex items-start justify-between gap-4 rounded-lg border p-4 text-left hover:border-primary hover:bg-muted/50"
            >
              <div>
                <p className="font-semibold">{svc.name}</p>
                {svc.description && (
                  <p className="text-sm text-muted-foreground">{svc.description}</p>
                )}
                <p className="text-sm font-medium mt-1">{svc.durationMin} min</p>
              </div>
              <p className="text-sm font-semibold shrink-0">
                {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(
                  svc.priceCents / 100,
                )}
              </p>
            </button>
          ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getNextWeekdays(count = 7): Array<{ iso: string; label: string }> {
  const result: Array<{ iso: string; label: string }> = [];
  const d = new Date();
  let added = 0;
  while (added < count) {
    d.setDate(d.getDate() + 1);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const iso = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("es-CL", { month: "short", day: "numeric" });
      result.push({ iso, label });
      added++;
    }
  }
  return result;
}

function generateDemoSlots(date: string, durationMin: number): string[] {
  const slots: string[] = [];
  const [y, m, day] = date.split("-").map(Number);
  // 09:00 – 17:00 on the hour for demo
  for (let h = 9; h + durationMin / 60 <= 17; h++) {
    const d = new Date(Date.UTC(y, m - 1, day, h, 0, 0));
    slots.push(d.toISOString());
  }
  return slots;
}
