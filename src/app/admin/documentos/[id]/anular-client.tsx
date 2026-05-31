"use client";

/**
 * AnularClient — T-34
 * Island: "Anular" button for admin DTE detail page.
 * Calls createCreditNote server action with reason and optional amount.
 * Spec: A-3, N-1
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCreditNote } from "@/app/actions/admin/documentos";

interface AnularClientProps {
  dteId: string;
  dteTotal: number;
}

export function AnularClient({ dteId, dteTotal }: AnularClientProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleAnular() {
    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const amount =
        amountStr.trim() ? parseInt(amountStr, 10) : undefined;
      const result = await createCreditNote({ dteId, reason, amount });
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
        <span>✓</span> Credit note created successfully.
      </div>
    );
  }

  return (
    <div>
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
        >
          Anular (Issue Credit Note)
        </button>
      ) : (
        <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-sm font-semibold text-red-800">
            Issue Credit Note (NC)
          </h3>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Error en precio, devolución"
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Amount (CLP) — leave empty for full credit (${dteTotal.toLocaleString("es-CL")})
            </label>
            <input
              type="number"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder={`${dteTotal}`}
              min="1"
              max={dteTotal}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-100 p-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAnular}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-1.5 px-4 rounded-md transition-colors text-sm"
            >
              {loading ? "Creating NC..." : "Confirm Credit Note"}
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
