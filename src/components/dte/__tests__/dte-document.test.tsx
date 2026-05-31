/**
 * T-21 [RED] → T-22 [GREEN] — DteDocument component tests
 * Spec: P-2
 * Renders the component to a static string and asserts required fields are present.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { DteDocument } from "@/components/dte/dte-document";
import type { DteDocumentProps } from "@/components/dte/dte-document";

const BASE_PROPS: DteDocumentProps = {
  id: "dte-abc-123",
  folio: 42,
  type: "boleta",
  documentCode: 39,
  issuedAt: new Date("2026-05-30T12:00:00Z"),
  issuerRut: "76000000-0",
  receiver: {
    rut: "66666666-6",
    name: "Consumidor Final",
    businessLine: "Particular",
    address: "Santiago",
  },
  items: [
    {
      description: "Alimento Premium",
      quantity: 2,
      unitPrice: 5950,
      lineTotal: 11900,
      afecto: true,
    },
  ],
  net: 10000,
  taxAmount: 1900,
  total: 11900,
  stamp: "c3RhbXAtdGVzdA==",
};

describe("DteDocument (P-2)", () => {
  it("P-2-a: renders without crashing", () => {
    const html = renderToStaticMarkup(React.createElement(DteDocument, BASE_PROPS));
    expect(html).toBeTruthy();
    expect(html.length).toBeGreaterThan(50);
  });

  it("P-2: renders folio in output", () => {
    const html = renderToStaticMarkup(React.createElement(DteDocument, BASE_PROPS));
    expect(html).toContain("42");
  });

  it("P-2: renders receiverRut in output", () => {
    const html = renderToStaticMarkup(React.createElement(DteDocument, BASE_PROPS));
    expect(html).toContain("66666666-6");
  });

  it("P-2: renders total in output", () => {
    const html = renderToStaticMarkup(React.createElement(DteDocument, BASE_PROPS));
    // 11900 formatted as CLP → "11.900"
    expect(html).toContain("11.900");
  });

  it("P-2: renders issuerRut in output", () => {
    const html = renderToStaticMarkup(React.createElement(DteDocument, BASE_PROPS));
    expect(html).toContain("76000000-0");
  });

  it("P-2: renders stamp in output", () => {
    const html = renderToStaticMarkup(React.createElement(DteDocument, BASE_PROPS));
    expect(html).toContain("c3RhbXAtdGVzdA==");
  });

  it("P-2: renders items table row with description", () => {
    const html = renderToStaticMarkup(React.createElement(DteDocument, BASE_PROPS));
    expect(html).toContain("Alimento Premium");
  });

  it("P-2: renders net and taxAmount", () => {
    const html = renderToStaticMarkup(React.createElement(DteDocument, BASE_PROPS));
    // Numbers are formatted as CLP (es-CL locale uses dots as thousand separators)
    expect(html).toContain("10.000");
    expect(html).toContain("1.900");
  });

  it("P-2: renders receiverName", () => {
    const html = renderToStaticMarkup(React.createElement(DteDocument, BASE_PROPS));
    expect(html).toContain("Consumidor Final");
  });

  it("P-2: renders documentCode", () => {
    const html = renderToStaticMarkup(React.createElement(DteDocument, BASE_PROPS));
    expect(html).toContain("39");
  });
});
