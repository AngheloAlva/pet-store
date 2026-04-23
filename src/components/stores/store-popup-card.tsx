"use client";

import { MapPin, Phone } from "@phosphor-icons/react";
import type { Store } from "@/types";

type Props = {
  store: Store;
};

export function StorePopupCard({ store }: Props) {
  const telHref = `tel:${store.phone.replace(/\s/g, "")}`;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="font-heading text-sm font-semibold text-foreground">
        {store.name}
      </p>
      <p className="inline-flex items-start gap-1 text-xs text-muted-foreground">
        <MapPin size={12} weight="regular" aria-hidden className="mt-0.5 shrink-0" />
        <span>{store.address}</span>
      </p>
      <a
        href={telHref}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <Phone size={12} weight="regular" aria-hidden />
        {store.phone}
      </a>
    </div>
  );
}
