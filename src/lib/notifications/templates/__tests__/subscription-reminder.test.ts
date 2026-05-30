/**
 * subscription-reminder template — XSS hardening tests (F3.5 security)
 */
import { describe, it, expect } from "vitest";

describe("subscription-reminder template", () => {
  it("renders basic fields in html and text", async () => {
    const { render } = await import("@/lib/notifications/templates/subscription-reminder");

    const result = render({
      userName: "Ana García",
      productName: "Dog Food Premium",
      frequencyDays: 30,
      nextChargeAt: new Date("2026-06-15"),
      discountedPrice: 12000,
    });

    expect(result.html).toContain("Ana García");
    expect(result.html).toContain("Dog Food Premium");
    expect(result.text).toContain("Ana García");
    expect(result.subject).toBeTruthy();
  });

  it("escapes <script> in userName — no raw script tag in html", async () => {
    const { render } = await import("@/lib/notifications/templates/subscription-reminder");

    const result = render({
      userName: "<script>alert(1)</script>",
      productName: "Dog Food",
      frequencyDays: 30,
      nextChargeAt: new Date("2026-06-15"),
      discountedPrice: 10000,
    });

    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;");
  });

  it("escapes <script> in productName — no raw script tag in html", async () => {
    const { render } = await import("@/lib/notifications/templates/subscription-reminder");

    const result = render({
      userName: "Ana",
      productName: '<img src=x onerror="alert(1)">',
      frequencyDays: 30,
      nextChargeAt: new Date("2026-06-15"),
      discountedPrice: 10000,
    });

    expect(result.html).not.toContain("<img");
    expect(result.html).toContain("&lt;img");
  });

  it("drops javascript: manageUrl from html href", async () => {
    const { render } = await import("@/lib/notifications/templates/subscription-reminder");

    const result = render({
      userName: "Ana",
      productName: "Dog Food",
      frequencyDays: 30,
      nextChargeAt: new Date("2026-06-15"),
      discountedPrice: 10000,
      manageUrl: "javascript:alert(1)",
    });

    expect(result.html).not.toContain("javascript:");
  });

  it("keeps a valid https manageUrl in html", async () => {
    const { render } = await import("@/lib/notifications/templates/subscription-reminder");

    const result = render({
      userName: "Ana",
      productName: "Dog Food",
      frequencyDays: 30,
      nextChargeAt: new Date("2026-06-15"),
      discountedPrice: 10000,
      manageUrl: "https://example.com/suscripciones",
    });

    expect(result.html).toContain("https://example.com/suscripciones");
  });

  it("drops javascript: manageUrl from text output too", async () => {
    const { render } = await import("@/lib/notifications/templates/subscription-reminder");

    const result = render({
      userName: "Ana",
      productName: "Dog Food",
      frequencyDays: 30,
      nextChargeAt: new Date("2026-06-15"),
      discountedPrice: 10000,
      manageUrl: "javascript:alert(1)",
    });

    expect(result.text).not.toContain("javascript:");
  });
});
