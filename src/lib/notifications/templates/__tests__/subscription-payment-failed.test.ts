/**
 * subscription-payment-failed template — XSS hardening tests (F3.5 security)
 */
import { describe, it, expect } from "vitest";

describe("subscription-payment-failed template", () => {
  it("renders basic fields in html and text", async () => {
    const { render } = await import(
      "@/lib/notifications/templates/subscription-payment-failed"
    );

    const result = render({
      userName: "Ana García",
      productName: "Dog Food Premium",
    });

    expect(result.html).toContain("Ana García");
    expect(result.html).toContain("Dog Food Premium");
    expect(result.text).toContain("Ana García");
    expect(result.subject).toBeTruthy();
  });

  it("escapes <script> in userName — no raw script tag in html", async () => {
    const { render } = await import(
      "@/lib/notifications/templates/subscription-payment-failed"
    );

    const result = render({
      userName: "<script>alert(1)</script>",
      productName: "Dog Food",
    });

    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;");
  });

  it("escapes <script> in productName — no raw script tag in html", async () => {
    const { render } = await import(
      "@/lib/notifications/templates/subscription-payment-failed"
    );

    const result = render({
      userName: "Ana",
      productName: '<img src=x onerror="alert(1)">',
    });

    expect(result.html).not.toContain("<img");
    expect(result.html).toContain("&lt;img");
  });

  it("escapes ampersand and quotes in userName", async () => {
    const { render } = await import(
      "@/lib/notifications/templates/subscription-payment-failed"
    );

    const result = render({
      userName: 'O\'Reilly & "Associates"',
      productName: "Cat Food",
    });

    expect(result.html).not.toContain('"Associates"');
    expect(result.html).toContain("&amp;");
    expect(result.html).toContain("&quot;");
  });
});
