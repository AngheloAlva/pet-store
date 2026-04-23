"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StoreCard } from "@/components/stores/store-card";
import { StoreMap } from "@/components/stores/store-map";
import { cn } from "@/lib/utils";
import type { Store } from "@/types";

type Props = {
  stores: Store[];
  initialSlug: string | null;
};

type SelectionSource = "init" | "card" | "marker" | "popup-close" | "url";

export function StoreLocator({ stores, initialSlug }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialSlug);
  const [showMap, setShowMap] = useState(false);

  const selectionSourceRef = useRef<SelectionSource>("init");
  const skipUrlSyncRef = useRef(true);
  const lastUrlSlugRef = useRef<string | null>(initialSlug);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  const registerCardRef = useCallback(
    (slug: string) => (node: HTMLElement | null) => {
      if (node) cardRefs.current.set(slug, node);
      else cardRefs.current.delete(slug);
    },
    [],
  );

  const handleSelect = useCallback(
    (source: SelectionSource) => (slug: string | null) => {
      selectionSourceRef.current = source;
      setSelectedSlug(slug);
    },
    [],
  );

  // URL sync on user-driven selection. Keep lastUrlSlugRef in sync so the
  // external-reconcile effect doesn't treat our own write as a back/forward.
  useEffect(() => {
    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false;
      return;
    }
    if (selectionSourceRef.current === "url") return;
    lastUrlSlugRef.current = selectedSlug;
    const next = new URLSearchParams();
    if (selectedSlug) next.set("tienda", selectedSlug);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [selectedSlug, pathname, router]);

  // Reconcile from external URL changes (back/forward): only react when the
  // URL slug actually changed from outside our own writes.
  useEffect(() => {
    const urlSlug = searchParams.get("tienda");
    if (urlSlug === lastUrlSlugRef.current) return;
    lastUrlSlugRef.current = urlSlug;
    const valid = urlSlug && stores.some((s) => s.slug === urlSlug);
    selectionSourceRef.current = "url";
    setSelectedSlug(valid ? urlSlug : null);
  }, [searchParams, stores]);

  // Scroll the card into view on marker click
  useEffect(() => {
    if (!selectedSlug) return;
    if (selectionSourceRef.current !== "marker") return;
    const node = cardRefs.current.get(selectedSlug);
    node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedSlug]);

  const onCardSelect = (slug: string) => handleSelect("card")(slug);
  const onMarkerSelect = (slug: string | null) => {
    // Distinguish close from marker click
    if (slug === null) handleSelect("popup-close")(null);
    else handleSelect("marker")(slug);
  };

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="md:hidden w-full"
        onClick={() => setShowMap((v) => !v)}
      >
        {showMap ? "Ocultar mapa" : "Mostrar mapa"}
      </Button>

      <div className="grid gap-6 md:grid-cols-[minmax(22rem,28rem)_1fr]">
        <ul className="space-y-3">
          {stores.map((store) => (
            <li key={store.id}>
              <StoreCard
                store={store}
                isSelected={store.slug === selectedSlug}
                onSelect={onCardSelect}
                registerRef={registerCardRef(store.slug)}
              />
            </li>
          ))}
        </ul>

        <div
          className={cn(
            "h-[60svh] md:h-[calc(100vh-12rem)] md:sticky md:top-24 rounded-lg overflow-hidden border border-border",
            !showMap && "hidden md:block",
          )}
        >
          <StoreMap
            stores={stores}
            selectedSlug={selectedSlug}
            onSelect={onMarkerSelect}
          />
        </div>
      </div>
    </div>
  );
}
