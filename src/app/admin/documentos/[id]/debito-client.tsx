"use client";

/**
 * DebitoClient — T-36-opt
 * Island: "Nota de Débito" button for admin DTE detail page.
 * Calls createDebitNote server action with reason and amount.
 * Spec: N-5 (UI surface)
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDebitNote } from "@/app/actions/admin/documentos";

interface DebitoClientProps {
  dteId: string;
}

export function DebitoClient({ dteId }: DebitoClientProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleDebito() {
    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }
    const amount = parseInt(amountStr, 10);
    if (!amountStr.trim() || isNaN(amount) || amount <= 0) {
      setError("A valid positive amount (CLP) is required for a Nota de Débito.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await createDebitNote({ dteId, reason, amount });
      if (result.ok) {
        setDone(true);
        router.refresh();
      } else {
        setError(`Error: ${result.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-green-700 font-medium">
        <span>✓</span> Debit note created successfully.
      </div>
    );
  }

  return (
    <div>
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
        >
          Nota de Débito
        </button>
      ) : (
        <div className="space-y-3 p-4 bg-amber-50 border border-amber-200 rounded-md">
          <h3 className="text-sm font-semibold text-amber-800">
            Issue Debit Note (ND)
          </h3>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Ajuste de precio, diferencia de tarifa"
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Amount (CLP) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="e.g. 11900"
              min="1"
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {error && (
            <div className="rounded-md bg-amber-100 p-2 text-xs text-amber-800">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleDebito}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium py-1.5 px-4 rounded-md transition-colors text-sm"
            >
              {loading ? "Creating ND..." : "Confirm Debit Note"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              disabled={loading}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-1.5 px-4 rounded-md transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
