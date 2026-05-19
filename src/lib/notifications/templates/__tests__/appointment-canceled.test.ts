import { describe, it, expect } from "vitest";
import { render } from "../appointment-canceled";

const data = {
  serviceName: "Baño y corte",
  startsAt: new Date("2026-05-23T10:00:00.000Z"),
  storeName: "Sucursal Providencia",
  userName: "Camila Rojas",
};

describe("appointment-canceled template", () => {
  it("subject contains serviceName", () => {
    const { subject } = render(data);
    expect(subject).toContain(data.serviceName);
  });

  it("text contains serviceName and storeName", () => {
    const { text } = render(data);
    expect(text).toContain(data.serviceName);
    expect(text).toContain(data.storeName);
  });

  it("html uses inline styles", () => {
    const { html } = render(data);
    expect(html).toContain("style=");
  });

  it("html contains userName", () => {
    const { html } = render(data);
    expect(html).toContain(data.userName);
  });

  it("returns subject, html, text strings", () => {
    const result = render(data);
    expect(typeof result.subject).toBe("string");
    expect(typeof result.html).toBe("string");
    expect(typeof result.text).toBe("string");
  });
});
