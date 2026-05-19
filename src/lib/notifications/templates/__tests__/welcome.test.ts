import { describe, it, expect } from "vitest";
import { render } from "../welcome";

describe("welcome template", () => {
  const data = { userName: "Camila Rojas" };

  it("subject is a greeting", () => {
    const { subject } = render(data);
    expect(typeof subject).toBe("string");
    expect(subject.length).toBeGreaterThan(0);
  });

  it("text contains userName", () => {
    const { text } = render(data);
    expect(text).toContain(data.userName);
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
