"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { PawPrint } from "@phosphor-icons/react";
import {
  Map,
  MapControls,
  MapMarker,
  MapPopup,
  MarkerContent,
} from "@/components/ui/map";
import { cn } from "@/lib/utils";
import { DEFAULT_MAP_VIEWPORT } from "@/lib/stores-constants";
import type { Store } from "@/types";
import { StorePopupCard } from "./store-popup-card";

type Props = {
  stores: Store[];
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
  className?: string;
};

const FOCUS_ZOOM = 14;
const FLY_DURATION = 800;

export function StoreMap({ stores, selectedSlug, onSelect, className }: Props) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const lastFlownSlug = useRef<string | null>(null);

  const selectedStore = selectedSlug
    ? stores.find((s) => s.slug === selectedSlug) ?? null
    : null;

  useEffect(() => {
    if (!selectedStore) return;
    if (lastFlownSlug.current === selectedStore.slug) return;
    lastFlownSlug.current = selectedStore.slug;
    mapRef.current?.flyTo({
      center: [selectedStore.coordinates.lng, selectedStore.coordinates.lat],
      zoom: FOCUS_ZOOM,
      duration: FLY_DURATION,
    });
  }, [selectedStore]);

  useEffect(() => {
    if (!selectedStore) lastFlownSlug.current = null;
  }, [selectedStore]);

  return (
    <Map
      ref={mapRef}
      theme="light"
      center={DEFAULT_MAP_VIEWPORT.center}
      zoom={DEFAULT_MAP_VIEWPORT.zoom}
      className={cn("h-full w-full rounded-lg", className)}
    >
      <MapControls position="bottom-right" showZoom />
      {stores.map((store) => {
        const isSelected = store.slug === selectedSlug;
        return (
          <MapMarker
            key={store.id}
            longitude={store.coordinates.lng}
            latitude={store.coordinates.lat}
            onClick={() => onSelect(store.slug)}
          >
            <MarkerContent>
              <span
                role="button"
                aria-label={store.name}
                tabIndex={0}
                data-selected={isSelected ? "true" : undefined}
                className={cn(
                  "grid place-items-center h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-md transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  isSelected &&
                    "scale-110 ring-2 ring-primary/60 ring-offset-2 ring-offset-background",
                )}
                onKeyDown={(e: React.KeyboardEvent<HTMLSpanElement>) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(store.slug);
                  }
                }}
              >
                <PawPrint size={16} weight="fill" aria-hidden />
              </span>
            </MarkerContent>
          </MapMarker>
        );
      })}
      {selectedStore ? (
        <MapPopup
          longitude={selectedStore.coordinates.lng}
          latitude={selectedStore.coordinates.lat}
          onClose={() => onSelect(null)}
          closeButton
        >
          <StorePopupCard store={selectedStore} />
        </MapPopup>
      ) : null}
    </Map>
  );
}
