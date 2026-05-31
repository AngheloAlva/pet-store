"use client";

/**
 * DocumentosFiltrosClient — admin DTE filter island (T-33)
 * Toggles filter inputs and pushes URL searchParams for server-side re-query.
 * Spec: A-1
 */
import { useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface DocumentosFiltrosClientProps {
  initialType?: string;
  initialDateFrom?: string;
  initialDateTo?: string;
  initialReceiverRut?: string;
  initialFolioFrom?: string;
  initialFolioTo?: string;
}

export function DocumentosFiltrosClient({
  initialType = "",
  initialDateFrom = "",
  initialDateTo = "",
  initialReceiverRut = "",
  initialFolioFrom = "",
  initialFolioTo = "",
}: DocumentosFiltrosClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [showFilters, setShowFilters] = useState(false);
  const [type, setType] = useState(initialType);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [receiverRut, setReceiverRut] = useState(initialReceiverRut);
  const [folioFrom, setFolioFrom] = useState(initialFolioFrom);
  const [folioTo, setFolioTo] = useState(initialFolioTo);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (type) params.set("type", type);
    else params.delete("type");

    if (dateFrom) params.set("dateFrom", dateFrom);
    else params.delete("dateFrom");

    if (dateTo) params.set("dateTo", dateTo);
    else params.delete("dateTo");

    if (receiverRut) params.set("receiverRut", receiverRut);
    else params.delete("receiverRut");

    if (folioFrom) params.set("folioFrom", folioFrom);
    else params.delete("folioFrom");

    if (folioTo) params.set("folioTo", folioTo);
    else params.delete("folioTo");

    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams, type, dateFrom, dateTo, receiverRut, folioFrom, folioTo]);

  const clearFilters = useCallback(() => {
    setType("");
    setDateFrom("");
    setDateTo("");
    setReceiverRut("");
    setFolioFrom("");
    setFolioTo("");
    router.push(pathname);
  }, [router, pathname]);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowFilters((v) => !v)}
        className="text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        {showFilters ? "Hide Filters" : "Show Filters"}
      </button>

      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Type filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Document Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All types</option>
                <option value="boleta">Boleta</option>
                <option value="factura">Factura</option>
                <option value="nota_credito">Nota de Crédito</option>
                <option value="nota_debito">Nota de Débito</option>
                <option value="guia">Guía</option>
              </select>
            </div>

            {/* Date from */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Receiver RUT */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Receiver RUT
              </label>
              <input
                type="text"
                value={receiverRut}
                onChange={(e) => setReceiverRut(e.target.value)}
                placeholder="e.g. 12345678"
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Folio from */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Folio From
              </label>
              <input
                type="number"
                value={folioFrom}
                onChange={(e) => setFolioFrom(e.target.value)}
                min="1"
                placeholder="e.g. 1"
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Folio to */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Folio To
              </label>
              <input
                type="number"
                value={folioTo}
                onChange={(e) => setFolioTo(e.target.value)}
                min="1"
                placeholder="e.g. 100"
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={applyFilters}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-4 rounded-md transition-colors"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium py-1.5 px-4 rounded-md transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
