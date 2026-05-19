import { describe, it, expect } from "vitest";
import { render } from "../restock-alert";

describe("restock-alert template", () => {
  const data = {
    productName: "Acana Pollo y Pavo",
    storeName: "Sucursal Providencia",
  };

  it("subject contains productName", () => {
    const { subject } = render(data);
    expect(subject).toContain(data.productName);
  });

  it("text contains productName and storeName", () => {
    const { text } = render(data);
    expect(text).toContain(data.productName);
    expect(text).toContain(data.storeName);
  });

  it("html uses inline styles", () => {
    const { html } = render(data);
    expect(html).toContain("style=");
  });

  it("includes variantName in text when provided", () => {
    const { text } = render({ ...data, variantName: "3kg" });
    expect(text).toContain("3kg");
  });

  it("returns subject, html, text strings", () => {
    const result = render(data);
    expect(typeof result.subject).toBe("string");
    expect(typeof result.html).toBe("string");
    expect(typeof result.text).toBe("string");
  });
});
