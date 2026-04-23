import { describe, expect, it } from "vitest";
import { absoluteUrl } from "./seo";
import { siteConfig } from "./site";

describe("absoluteUrl", () => {
  it("returns the site root for '/'", () => {
    expect(absoluteUrl("/")).toBe(`${siteConfig.url}/`);
  });

  it("concatenates a nested path without trailing slash", () => {
    expect(absoluteUrl("/producto/pro-plan-adulto")).toBe(
      `${siteConfig.url}/producto/pro-plan-adulto`,
    );
  });

  it("normalizes a path without leading slash", () => {
    expect(absoluteUrl("catalogo")).toBe(`${siteConfig.url}/catalogo`);
  });

  it("collapses leading double slashes", () => {
    expect(absoluteUrl("//carrito")).toBe(`${siteConfig.url}/carrito`);
  });

  it("strips trailing slashes on non-root paths", () => {
    expect(absoluteUrl("/catalogo/")).toBe(`${siteConfig.url}/catalogo`);
  });

  it("returns the site root for empty input", () => {
    expect(absoluteUrl("")).toBe(`${siteConfig.url}/`);
  });
});
