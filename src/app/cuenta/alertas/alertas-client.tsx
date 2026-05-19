"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { cancelRestockAlert } from "@/app/actions/restock-alerts";
import type { AlertRow } from "./page";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  fired: "Notificada",
  canceled: "Cancelada",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "text-yellow-600 bg-yellow-50 border-yellow-200",
  fired: "text-green-600 bg-green-50 border-green-200",
  canceled: "text-gray-500 bg-gray-50 border-gray-200",
};

interface Props {
  alerts: AlertRow[];
}

export function AlertasClient({ alerts }: Props) {
  const [, startTransition] = useTransition();

  function handleCancel(alertId: string) {
    startTransition(async () => {
      const result = await cancelRestockAlert({ kind: "id", alertId });
      if (result.ok) {
        toast.success("Alerta cancelada.");
      } else {
        toast.error("No se pudo cancelar la alerta.");
      }
    });
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="rounded-lg border p-4 flex items-start justify-between gap-4"
        >
          <div className="space-y-1">
            <p className="font-semibold">
              {alert.productName}
              {alert.variantName && (
                <span className="text-muted-foreground font-normal"> — {alert.variantName}</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Suscripto el{" "}
              {alert.createdAt instanceof Date
                ? alert.createdAt.toLocaleDateString("es-CL")
                : new Date(alert.createdAt).toLocaleDateString("es-CL")}
            </p>
            <span
              className={`inline-block text-xs px-2 py-0.5 rounded border ${STATUS_CLASS[alert.status] ?? ""}`}
            >
              {STATUS_LABEL[alert.status] ?? alert.status}
            </span>
          </div>

          {alert.status === "pending" && (
            <button
              type="button"
              onClick={() => handleCancel(alert.id)}
              className="shrink-0 text-sm text-destructive hover:underline"
            >
              Cancelar
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
