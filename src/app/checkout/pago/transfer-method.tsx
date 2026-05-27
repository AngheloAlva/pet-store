"use client";

/**
 * TransferMethod — F3.2b
 * Client island for the bank transfer payment method.
 * Displays hardcoded fake bank details and a file picker for the receipt image.
 * On file selection, reads as base64 dataUrl and submits via submitTransferReceipt.
 */
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { submitTransferReceipt } from "@/app/actions/checkout/submit-transfer-receipt";

interface TransferMethodProps {
  sessionId: string;
  bankReference: string;
  amount: number;
}

// Fake bank details for demo purposes
const FAKE_BANK = {
  bank: "BancoDemo S.A.",
  accountType: "Cuenta Corriente",
  accountNumber: "00123456789",
  rut: "76.543.210-K",
  holder: "PetStore Demo SpA",
};

function formatCLP(amount: number): string {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(amount);
}

export function TransferMethod({ sessionId, bankReference, amount }: TransferMethodProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        setError("Could not read file. Please try again.");
        return;
      }

      setLoading(true);
      try {
        const result = await submitTransferReceipt({
          sessionId,
          dataUrl,
          bankReference,
        });

        if (result.ok) {
          router.push(`/checkout/pendiente/${result.orderNumber}`);
        } else {
          setError(
            result.code === "VALIDATION_ERROR"
              ? "Invalid file. Please upload a PNG, JPEG, or WebP image under 2MB."
              : "Error submitting receipt. Please try again.",
          );
        }
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError("Could not read file. Please try again.");
    };

    reader.readAsDataURL(file);
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">TR</span>
        </div>
        <div>
          <p className="font-medium text-gray-900">Transferencia bancaria (Demo)</p>
          <p className="text-xs text-gray-500">Sube el comprobante de tu transferencia</p>
        </div>
      </div>

      {/* Bank details */}
      <div className="bg-blue-50 rounded-md border border-blue-200 p-3 space-y-1.5">
        <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">
          Datos bancarios
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-gray-500">Banco</span>
          <span className="font-medium text-gray-900">{FAKE_BANK.bank}</span>
          <span className="text-gray-500">Tipo de cuenta</span>
          <span className="font-medium text-gray-900">{FAKE_BANK.accountType}</span>
          <span className="text-gray-500">N° de cuenta</span>
          <span className="font-medium text-gray-900 font-mono">{FAKE_BANK.accountNumber}</span>
          <span className="text-gray-500">RUT</span>
          <span className="font-medium text-gray-900">{FAKE_BANK.rut}</span>
          <span className="text-gray-500">Titular</span>
          <span className="font-medium text-gray-900">{FAKE_BANK.holder}</span>
          <span className="text-gray-500">Monto exacto</span>
          <span className="font-semibold text-blue-700">{formatCLP(amount)}</span>
          <span className="text-gray-500">Referencia</span>
          <span className="font-medium text-gray-900 font-mono">{bankReference}</span>
        </div>
      </div>

      {/* File picker */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Adjuntar comprobante de transferencia
        </p>
        <p className="text-xs text-gray-500 mb-3">
          Acepta PNG, JPEG o WebP — máximo 2MB
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleFileChange}
          disabled={loading}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-medium
            file:bg-emerald-50 file:text-emerald-700
            hover:file:bg-emerald-100
            disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {selectedFileName && !loading && (
          <p className="mt-2 text-sm text-gray-600">
            Selected: <span className="font-medium">{selectedFileName}</span>
          </p>
        )}

        {loading && (
          <p className="mt-2 text-sm text-emerald-600">Uploading receipt...</p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
    </div>
  );
}
