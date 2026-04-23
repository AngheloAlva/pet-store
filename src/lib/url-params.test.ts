import { describe, expect, it } from "vitest";
import {
  parseCatalogQuery,
  serializeCatalogQuery,
  stripDiacritics,
} from "./url-params";

describe("stripDiacritics", () => {
  it("lowercases and strips accents", () => {
    expect(stripDiacritics("Ñuñoa")).toBe("nunoa");
    expect(stripDiacritics("PELUQUERÍA")).toBe("peluqueria");
    expect(stripDiacritics("Royal Canin")).toBe("royal canin");
  });
});

describe("parseCatalogQuery", () => {
  it("returns sane defaults for empty params", () => {
    const q = parseCatalogQuery({});
    expect(q).toEqual({
      q: "",
      categorias: [],
      especies: [],
      marcas: [],
      tags: [],
      precio: null,
      orden: "relevancia",
      page: 1,
    });
  });

  it("falls back to relevancia on unknown sort", () => {
    expect(parseCatalogQuery({ orden: "random" }).orden).toBe("relevancia");
  });

  it("clamps page minimum to 1 but does NOT clamp the max", () => {
    expect(parseCatalogQuery({ page: "0" }).page).toBe(1);
    expect(parseCatalogQuery({ page: "-5" }).page).toBe(1);
    expect(parseCatalogQuery({ page: "99" }).page).toBe(99);
    expect(parseCatalogQuery({ page: "abc" }).page).toBe(1);
  });

  it("parses precio as inclusive range when valid", () => {
    expect(parseCatalogQuery({ precio: "0-30000" }).precio).toEqual({
      min: 0,
      max: 30000,
    });
    expect(parseCatalogQuery({ precio: "30000-10000" }).precio).toBeNull();
    expect(parseCatalogQuery({ precio: "bad" }).precio).toBeNull();
  });

  it("splits comma-separated multi-value params", () => {
    const q = parseCatalogQuery({
      especie: "dog,cat",
      marca: "royal-canin,kong",
      tag: "sale,bestseller",
      categoria: "perros,alimentos-gatos",
    });
    expect(q.especies).toEqual(["dog", "cat"]);
    expect(q.marcas).toEqual(["royal-canin", "kong"]);
    expect(q.tags).toEqual(["sale", "bestseller"]);
    expect(q.categorias).toEqual(["perros", "alimentos-gatos"]);
  });

  it("drops unknown species and tag values", () => {
    expect(parseCatalogQuery({ especie: "dog,alien" }).especies).toEqual(["dog"]);
    expect(parseCatalogQuery({ tag: "sale,invented" }).tags).toEqual(["sale"]);
  });
});

describe("serializeCatalogQuery", () => {
  it("omits default and empty fields", () => {
    const params = serializeCatalogQuery({
      q: "",
      categorias: [],
      especies: [],
      marcas: [],
      tags: [],
      precio: null,
      orden: "relevancia",
      page: 1,
    });
    expect(params.toString()).toBe("");
  });

  it("serializes multi-values as comma-separated", () => {
    const params = serializeCatalogQuery({
      especies: ["dog", "cat"],
      marcas: ["royal-canin"],
    });
    expect(params.get("especie")).toBe("dog,cat");
    expect(params.get("marca")).toBe("royal-canin");
  });

  it("only emits page when > 1 and orden when != relevancia", () => {
    const params = serializeCatalogQuery({ page: 2, orden: "precio-asc" });
    expect(params.get("page")).toBe("2");
    expect(params.get("orden")).toBe("precio-asc");
  });

  it("round-trips a full query", () => {
    const original = {
      q: "kong",
      categorias: ["perros"],
      especies: ["dog" as const],
      marcas: ["kong"],
      tags: ["bestseller" as const],
      precio: { min: 0, max: 30000 },
      orden: "precio-asc" as const,
      page: 2,
    };
    const params = serializeCatalogQuery(original);
    const parsed = parseCatalogQuery(
      Object.fromEntries(params.entries()) as Record<string, string>,
    );
    expect(parsed).toEqual(original);
  });
});
