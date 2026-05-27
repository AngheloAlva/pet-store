/**
 * Task 2.1 RED — canTransition tests (table-driven, spec SH-3)
 */
import { describe, it, expect } from "vitest";

describe("canTransition", () => {
  it("preparando → en_ruta is valid for propio", async () => {
    const { canTransition } = await import("./transitions");
    expect(canTransition("propio", "preparando", "en_ruta")).toBe(true);
  });

  it("preparando → listo is valid for pickup", async () => {
    const { canTransition } = await import("./transitions");
    expect(canTransition("pickup", "preparando", "listo")).toBe(true);
  });

  it("entregado → anything is invalid (terminal)", async () => {
    const { canTransition } = await import("./transitions");
    expect(canTransition("propio", "entregado", "en_ruta")).toBe(false);
    expect(canTransition("propio", "entregado", "preparando")).toBe(false);
    expect(canTransition("propio", "entregado", "listo")).toBe(false);
  });

  it("fallido → anything is invalid (terminal)", async () => {
    const { canTransition } = await import("./transitions");
    expect(canTransition("mock_chilexpress", "fallido", "en_ruta")).toBe(false);
  });

  it("en_ruta → entregado is valid for mock couriers", async () => {
    const { canTransition } = await import("./transitions");
    expect(canTransition("mock_chilexpress", "en_ruta", "entregado")).toBe(true);
    expect(canTransition("mock_starken", "en_ruta", "entregado")).toBe(true);
  });

  it("en_ruta → fallido is valid", async () => {
    const { canTransition } = await import("./transitions");
    expect(canTransition("propio", "en_ruta", "fallido")).toBe(true);
  });

  it("listo → entregado is valid for pickup", async () => {
    const { canTransition } = await import("./transitions");
    expect(canTransition("pickup", "listo", "entregado")).toBe(true);
  });

  it("listo → fallido is valid for pickup", async () => {
    const { canTransition } = await import("./transitions");
    expect(canTransition("pickup", "listo", "fallido")).toBe(true);
  });

  it("preparando → entregado is invalid (skip)", async () => {
    const { canTransition } = await import("./transitions");
    expect(canTransition("propio", "preparando", "entregado")).toBe(false);
  });
});
