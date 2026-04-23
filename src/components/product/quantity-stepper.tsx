"use client";

import { Minus, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { clampQuantity } from "@/lib/pdp";

type Props = {
  value: number;
  onChange: (next: number) => void;
};

export function QuantityStepper({ value, onChange }: Props) {
  const atMin = value <= 1;
  const atMax = value >= 99;

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        onClick={() => onChange(clampQuantity(value - 1))}
        disabled={atMin}
        aria-label="Disminuir cantidad"
      >
        <Minus size={14} />
      </Button>
      <input
        type="number"
        inputMode="numeric"
        aria-label="Cantidad"
        value={value}
        onChange={(e) => onChange(clampQuantity(Number(e.target.value)))}
        className="h-8 w-14 rounded-md border border-border bg-background text-center text-sm font-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        min={1}
        max={99}
      />
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        onClick={() => onChange(clampQuantity(value + 1))}
        disabled={atMax}
        aria-label="Aumentar cantidad"
      >
        <Plus size={14} />
      </Button>
    </div>
  );
}
