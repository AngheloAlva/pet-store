"use client";

import { STORE_SERVICE_META } from "@/lib/stores";
import { cn } from "@/lib/utils";
import type { StoreService } from "@/types";

type Props = {
  service: StoreService;
  className?: string;
};

export function StoreServiceBadge({ service, className }: Props) {
  const meta = STORE_SERVICE_META[service];
  const Icon = meta.Icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground",
        className,
      )}
    >
      <Icon size={12} weight="regular" aria-hidden />
      {meta.label}
    </span>
  );
}
