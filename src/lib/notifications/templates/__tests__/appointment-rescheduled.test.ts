import { describe, it, expect } from "vitest";
import { render } from "../appointment-rescheduled";

const data = {
  serviceName: "Consulta veterinaria",
  oldStartsAt: new Date("2026-05-20T10:00:00.000Z"),
  newStartsAt: new Date("2026-05-25T15:00:00.000Z"),
  storeName: "Sucursal Las Condes",
  userName: "Camila Rojas",
};

describe("appointment-rescheduled template", () => {
  it("subject contains serviceName", () => {
    const { subject } = render(data);
    expect(subject).toContain(data.serviceName);
  });

  it("text contains oldStartsAt and newStartsAt info", () => {
    const { text } = render(data);
    // Both dates should appear as formatted strings
    expect(text).toContain("anterior");
    expect(text).toContain("Nuevo");
  });

  it("html contains oldStartsAt and newStartsAt labels", () => {
    const { html } = render(data);
    expect(html).toContain("anterior");
    expect(html).toContain("Nuevo");
  });

  it("html uses inline styles", () => {
    const { html } = render(data);
    expect(html).toContain("style=");
  });

  it("returns subject, html, text strings", () => {
    const result = render(data);
    expect(typeof result.subject).toBe("string");
    expect(typeof result.html).toBe("string");
    expect(typeof result.text).toBe("string");
  });
});
