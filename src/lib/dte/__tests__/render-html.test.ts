/**
 * TDD RED → GREEN — renderDteHtml pure function tests
 * Spec: P-2 fallback (pure HTML string render, no react-dom/server)
 *
 * Asserts:
 *  - Required DTE fields appear in output (folio, net, IVA, total)
 *  - XSS: user-controlled fields (receiverName, businessLine, item description) are escaped
 */
import { describe, it, expect } from "vitest";
import { renderDteHtml } from "@/lib/dte/render-html";
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

describe("renderDteHtml (P-2 fallback)", () => {
  it("returns a non-empty HTML string", () => {
    const html = renderDteHtml(BASE_PROPS);
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(100);
  });

  it("contains the folio number", () => {
    const html = renderDteHtml(BASE_PROPS);
    expect(html).toContain("42");
  });

  it("contains formatted net amount (es-CL)", () => {
    const html = renderDteHtml(BASE_PROPS);
    expect(html).toContain("10.000");
  });

  it("contains formatted IVA amount (es-CL)", () => {
    const html = renderDteHtml(BASE_PROPS);
    expect(html).toContain("1.900");
  });

  it("contains formatted total amount (es-CL)", () => {
    const html = renderDteHtml(BASE_PROPS);
    expect(html).toContain("11.900");
  });

  it("contains issuerRut", () => {
    const html = renderDteHtml(BASE_PROPS);
    expect(html).toContain("76000000-0");
  });

  it("contains receiverRut", () => {
    const html = renderDteHtml(BASE_PROPS);
    expect(html).toContain("66666666-6");
  });

  it("contains receiverName", () => {
    const html = renderDteHtml(BASE_PROPS);
    expect(html).toContain("Consumidor Final");
  });

  it("contains stamp", () => {
    const html = renderDteHtml(BASE_PROPS);
    expect(html).toContain("c3RhbXAtdGVzdA==");
  });

  it("contains item description", () => {
    const html = renderDteHtml(BASE_PROPS);
    expect(html).toContain("Alimento Premium");
  });

  it("XSS: escapes <script> in receiverName", () => {
    const malicious = { ...BASE_PROPS, receiver: { ...BASE_PROPS.receiver, name: '<script>alert("xss")</script>' } };
    const html = renderDteHtml(malicious);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("XSS: escapes <script> in businessLine", () => {
    const malicious = { ...BASE_PROPS, receiver: { ...BASE_PROPS.receiver, businessLine: '<img src=x onerror=alert(1)>' } };
    const html = renderDteHtml(malicious);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("XSS: escapes <script> in item description", () => {
    const maliciousItems = [{ ...BASE_PROPS.items[0], description: '<b onclick="pwn()">click</b>' }];
    const malicious = { ...BASE_PROPS, items: maliciousItems };
    const html = renderDteHtml(malicious);
    expect(html).not.toContain("<b ");
    expect(html).toContain("&lt;b ");
  });
});
