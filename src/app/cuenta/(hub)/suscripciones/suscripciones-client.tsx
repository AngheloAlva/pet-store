"use client";

/**
 * SuscripcionesClient — F3.5
 * Management island for subscription actions: pause, resume, cancel.
 * Mirrors FailureModeToggle pattern (F3.2b).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Subscription } from "@/db/schema";
import {
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
} from "@/app/actions/cuenta/suscripciones";

interface Props {
  subscriptions: Subscription[];
}

export function SuscripcionesClient({ subscriptions }: Props) {
  return (
    <div className="space-y-4">
      {subscriptions.map((sub) => (
        <SubscriptionRow key={sub.id} subscription={sub} />
      ))}
    </div>
  );
}

function SubscriptionRow({ subscription: sub }: { subscription: Subscription }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePause() {
    setLoading(true);
    setError(null);
    try {
      const result = await pauseSubscription(sub.id, { type: "indefinite" });
      if (!result.ok) setError(`Error: ${result.code}`);
      else router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleResume() {
    setLoading(true);
    setError(null);
    try {
      const result = await resumeSubscription(sub.id);
      if (!result.ok) setError(`Error: ${result.code}`);
      else router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    setError(null);
    try {
      const result = await cancelSubscription(sub.id);
      if (!result.ok) setError(`Error: ${result.code}`);
      else router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const isActive = sub.status === "active";
  const isPaused = sub.status === "paused";

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Suscripción {sub.id.slice(0, 8)}</p>
          <p className="text-xs text-muted-foreground">
            Cada {sub.frequencyDays} días · {sub.discountPercent}% descuento · Estado: {sub.status}
          </p>
          <p className="text-xs text-muted-foreground">
            Próximo cobro: {new Date(sub.nextChargeAt).toLocaleDateString("es-CL")}
          </p>
        </div>

        <div className="flex gap-2">
          {isActive && (
            <button
              type="button"
              onClick={handlePause}
              disabled={loading}
              className="rounded-md bg-yellow-100 px-3 py-1.5 text-xs font-medium text-yellow-800 hover:bg-yellow-200 disabled:opacity-50"
            >
              Pausar
            </button>
          )}

          {isPaused && (
            <button
              type="button"
              onClick={handleResume}
              disabled={loading}
              className="rounded-md bg-green-100 px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-200 disabled:opacity-50"
            >
              Reanudar
            </button>
          )}

          {(isActive || isPaused) && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-200 disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {loading && <p className="text-xs text-muted-foreground">Procesando...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
