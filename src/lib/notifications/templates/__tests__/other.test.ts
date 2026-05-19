import { describe, it, expect } from "vitest";
import { render } from "../other";

describe("other template (passthrough)", () => {
  const data = {
    subject: "Mensaje especial",
    html: "<p>Hola!</p>",
    text: "Hola!",
  };

  it("output subject equals input subject", () => {
    const { subject } = render(data);
    expect(subject).toBe(data.subject);
  });

  it("output html equals input html", () => {
    const { html } = render(data);
    expect(html).toBe(data.html);
  });

  it("output text equals input text", () => {
    const { text } = render(data);
    expect(text).toBe(data.text);
  });
});
