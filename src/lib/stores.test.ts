import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAP_VIEWPORT,
  getStoreBySlug,
  getStoresCommuneSummary,
  STORE_SERVICE_META,
} from "./stores";
import { stores } from "@/data";

describe("getStoreBySlug", () => {
  it("returns the store for an existing slug", () => {
    const s = getStoreBySlug("maipu");
    expect(s?.slug).toBe("maipu");
    expect(s?.commune).toBe("Maipú");
  });

  it("returns undefined for a missing slug", () => {
    expect(getStoreBySlug("no-existe")).toBeUndefined();
  });

  it("returns undefined for null or undefined", () => {
    expect(getStoreBySlug(null)).toBeUndefined();
    expect(getStoreBySlug(undefined)).toBeUndefined();
    expect(getStoreBySlug("")).toBeUndefined();
  });
});

describe("DEFAULT_MAP_VIEWPORT", () => {
  it("centers over Santiago at zoom 10", () => {
    expect(DEFAULT_MAP_VIEWPORT.center).toEqual([-70.65, -33.45]);
    expect(DEFAULT_MAP_VIEWPORT.zoom).toBe(10);
  });
});

describe("getStoresCommuneSummary", () => {
  it("joins all commune names with commas", () => {
    const summary = getStoresCommuneSummary();
    for (const store of stores) {
      expect(summary).toContain(store.commune);
    }
    expect(summary).toContain(",");
  });
});

describe("STORE_SERVICE_META", () => {
  it("maps every service to a Spanish label and a component icon", () => {
    const keys = ["shop", "vet", "grooming", "pharmacy"] as const;
    for (const k of keys) {
      expect(STORE_SERVICE_META[k].label).toMatch(/^[A-ZÁÉÍÓÚÜÑ]/);
      expect(typeof STORE_SERVICE_META[k].Icon).toBe("object");
    }
    expect(STORE_SERVICE_META.shop.label).toBe("Tienda");
    expect(STORE_SERVICE_META.vet.label).toBe("Veterinaria");
    expect(STORE_SERVICE_META.grooming.label).toBe("Peluquería");
    expect(STORE_SERVICE_META.pharmacy.label).toBe("Farmacia");
  });
});
