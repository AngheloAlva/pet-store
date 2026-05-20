"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

interface StockSearchInputProps {
  query: string;
  storeId: string;
}

export function StockSearchInput({ query, storeId }: StockSearchInputProps) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleChange = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      params.set("store", storeId);
      params.set("tab", "stock");
      if (value) params.set("q", value);
      router.replace(`/staff?${params.toString()}`);
    }, 300);
  };

  return (
    <input
      type="search"
      defaultValue={query}
      placeholder="Buscar producto…"
      className="min-h-12 w-full rounded-lg border border-border bg-background px-4 text-base"
      onChange={(e) => handleChange(e.target.value)}
    />
  );
}
