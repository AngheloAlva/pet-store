import { describe, expect, it } from "vitest";
import robots from "./robots";
import { absoluteUrl } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

describe("robots", () => {
  const value = robots();

  it("allows all crawlers from the site root", () => {
    const rules = Array.isArray(value.rules) ? value.rules : [value.rules];
    expect(rules[0]).toMatchObject({ userAgent: "*", allow: "/" });
  });

  it("points at the sitemap", () => {
    expect(value.sitemap).toBe(absoluteUrl("/sitemap.xml"));
  });

  it("sets the canonical host", () => {
    expect(value.host).toBe(siteConfig.url);
  });
});
