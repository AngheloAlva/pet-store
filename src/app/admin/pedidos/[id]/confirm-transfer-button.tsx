"use client";

/**
 * ConfirmTransferButton — F3.2b
 * Client island: calls confirmTransfer(orderId).
 * Hides itself or shows disabled state after success.
 */
import { useState } from "react";
import { confirmTransfer } from "@/app/actions/admin/orders";

interface ConfirmTransferButtonProps {
  orderId: string;
}

export function ConfirmTransferButton({ orderId }: ConfirmTransferButtonProps) {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const result = await confirmTransfer(orderId);
      if (result.ok) {
        setConfirmed(true);
      } else {
        setError(
          result.code === "ALREADY_PAID"
            ? "This transfer has already been confirmed."
            : `Error confirming transfer: ${result.code}`,
        );
      }
    } finally {
      setLoading(false);
    }
  }

  if (confirmed) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-green-700 font-medium">
        <span>✓</span> Transfer confirmed
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      <button
        onClick={handleConfirm}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
      >
        {loading ? "Confirming..." : "Confirm transfer"}
      </button>
    </div>
  );
}
