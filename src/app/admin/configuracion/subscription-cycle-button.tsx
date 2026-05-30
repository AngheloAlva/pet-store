"use client";

/**
 * SubscriptionCycleRunButton — F3.5
 * Admin button to manually trigger the subscription cycle runner.
 * Mirrors FailureModeToggle pattern (F3.2b).
 */
import { useState } from "react";
import { runSubscriptionCycle, sendSubscriptionReminders } from "@/app/actions/admin/subscriptions";

interface CycleResult {
  succeeded: number;
  failed: number;
  skipped: number;
}

export function SubscriptionCycleRunButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CycleResult | null>(null);

  async function handleRun() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Also trigger reminders in same admin action
      await sendSubscriptionReminders();
      const cycleResult = await runSubscriptionCycle();

      if (cycleResult.ok) {
        setResult(cycleResult.result);
      } else {
        setError(`Error: ${cycleResult.code}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleRun}
        disabled={loading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Ejecutando..." : "Ejecutar ciclo de suscripciones ahora"}
      </button>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 space-y-1">
          <p className="text-sm font-medium text-green-800">Ciclo ejecutado con éxito</p>
          <ul className="text-sm text-green-700 space-y-0.5">
            <li>Exitosas: {result.succeeded}</li>
            <li>Fallidas: {result.failed}</li>
            <li>Omitidas: {result.skipped}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
