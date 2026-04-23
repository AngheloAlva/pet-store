"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Image as ProductImage } from "@/types";

type Props = {
  images: ProductImage[];
};

export function ProductGallery({ images }: Props) {
  const [index, setIndex] = useState(0);
  const hero = images[index] ?? images[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
        {hero && (
          <Image
            src={hero.url}
            alt={hero.alt}
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            priority
            className="object-cover"
          />
        )}
      </div>
      {images.length > 1 && (
        <ul className="flex gap-2">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ver ${img.alt}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition-colors",
                  i === index ? "border-primary" : "border-transparent",
                )}
              >
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
