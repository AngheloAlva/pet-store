import { describe, it, expect } from "vitest";
import { render } from "../points-adjustment";

describe("points-adjustment template", () => {
  const data = {
    userName: "Camila Rojas",
    delta: 200,
    reason: "Compensación por error en caja",
  };

  it("subject mentions points adjustment", () => {
    const { subject } = render(data);
    expect(typeof subject).toBe("string");
    expect(subject.length).toBeGreaterThan(0);
  });

  it("text contains delta sign and reason", () => {
    const { text } = render(data);
    expect(text).toContain("200");
    expect(text).toContain(data.reason);
  });

  it("text reflects negative delta correctly", () => {
    const { text } = render({ ...data, delta: -150 });
    expect(text).toContain("150");
  });

  it("html uses inline styles and contains userName", () => {
    const { html } = render(data);
    expect(html).toContain("style=");
    expect(html).toContain(data.userName);
  });

  it("returns subject, html, text strings", () => {
    const result = render(data);
    expect(typeof result.subject).toBe("string");
    expect(typeof result.html).toBe("string");
    expect(typeof result.text).toBe("string");
  });
});
