"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { MapPin, Phone, Clock } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { Store } from "@/types";
import { StoreServiceBadge } from "./store-service-badge";

type Props = {
  store: Store;
  isSelected: boolean;
  onSelect: (slug: string) => void;
  registerRef?: (node: HTMLElement | null) => void;
};

export function StoreCard({ store, isSelected, onSelect, registerRef }: Props) {
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    registerRef?.(btnRef.current);
    return () => {
      registerRef?.(null);
    };
  }, [registerRef]);

  const telHref = `tel:${store.phone.replace(/\s/g, "")}`;

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={() => onSelect(store.slug)}
      aria-current={isSelected ? "true" : undefined}
      className={cn(
        "block w-full text-left rounded-lg border border-border bg-background overflow-hidden transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "hover:border-primary/60",
        isSelected && "border-primary ring-2 ring-primary/40",
      )}
    >
      {store.imageUrl ? (
        <div className="relative w-full h-36">
          <Image
            src={store.imageUrl}
            alt={store.name}
            fill
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-heading text-base font-semibold text-foreground">
              {store.name}
            </p>
            <p className="text-xs text-muted-foreground">{store.commune}</p>
          </div>
        </div>

        <div className="mt-2 space-y-1.5 text-sm">
          <p className="flex items-start gap-1.5 text-muted-foreground">
            <MapPin size={14} weight="regular" aria-hidden className="mt-0.5 shrink-0" />
            <span>{store.address}</span>
          </p>
          {store.reference ? (
            <p className="pl-5 text-xs text-muted-foreground/80">
              {store.reference}
            </p>
          ) : null}
          <p>
            <span className="inline-flex items-center gap-1.5">
              <Phone size={14} weight="regular" aria-hidden />
              <a
                href={telHref}
                onClick={(e) => e.stopPropagation()}
                className="font-medium text-primary hover:underline"
              >
                {store.phone}
              </a>
            </span>
          </p>
        </div>

        {store.services.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {store.services.map((svc) => (
              <li key={svc}>
                <StoreServiceBadge service={svc} />
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-3 rounded-md bg-muted/40 p-2 text-xs">
          <p className="mb-1 inline-flex items-center gap-1.5 font-medium text-foreground">
            <Clock size={12} weight="regular" aria-hidden />
            Horario
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-muted-foreground">
            <dt>Lun–Vie</dt>
            <dd className="tabular-nums">{store.schedule.weekdays}</dd>
            <dt>Sábado</dt>
            <dd className="tabular-nums">{store.schedule.saturday}</dd>
            <dt>Domingo</dt>
            <dd className="tabular-nums">{store.schedule.sunday}</dd>
          </dl>
        </div>
      </div>
    </button>
  );
}
