"use client";

/**
 * FailureModeToggle — F3.2b
 * Client island: checkbox/toggle reflecting the current paymentFailureMode state.
 * On change, calls updateFailureMode(enabled).
 */
import { useState } from "react";
import { updateFailureMode } from "@/app/actions/admin/settings";

interface FailureModeToggleProps {
  initial: boolean;
}

export function FailureModeToggle({ initial }: FailureModeToggleProps) {
  const [enabled, setEnabled] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.checked;
    setLoading(true);
    setError(null);

    try {
      const result = await updateFailureMode(newValue);
      if (result.ok) {
        setEnabled(newValue);
      } else {
        setError(`Error: ${result.code}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleChange}
          disabled={loading}
          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 disabled:opacity-50"
        />
        <span className="text-sm font-medium text-gray-900">
          {enabled ? "Failure mode is ON — ~10% of gateway verifications will fail" : "Failure mode is OFF — all verifications pass normally"}
        </span>
      </label>

      {loading && (
        <p className="text-sm text-gray-500">Saving...</p>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {enabled && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700 font-medium">
            Warning: Payment failure simulation is active.
          </p>
          <p className="text-xs text-red-600 mt-1">
            Approximately 10% of checkout payment verifications will randomly return a rejection.
            Disable this before running real transactions.
          </p>
        </div>
      )}
    </div>
  );
}
