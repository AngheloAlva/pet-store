/**
 * Task 5.1 RED — order_confirmation email template test.
 */
import { describe, it, expect } from "vitest";

describe("order-confirmation template", () => {
  it("rendered output contains orderNumber", async () => {
    const { render } = await import("@/lib/notifications/templates/order-confirmation");

    const result = render({
      orderNumber: "PET-20260526-00001",
      customerName: "Ana García",
      items: [{ name: "Dog Food", qty: 2, lineTotal: 10000 }],
      subtotal: 10000,
      shippingCost: 3990,
      discount: 0,
      total: 13990,
      shippingAddress: { street: "Providencia 123", commune: "Providencia" },
      dteId: "DTE-MOCK-ABCD1234",
      paymentMethodLabel: "Webpay (Demo)",
    });

    expect(result.html).toContain("PET-20260526-00001");
    expect(result.text).toContain("PET-20260526-00001");
    expect(result.subject).toBeTruthy();
  });

  it("rendered output contains customer name", async () => {
    const { render } = await import("@/lib/notifications/templates/order-confirmation");

    const result = render({
      orderNumber: "PET-20260526-00001",
      customerName: "Ana García",
      items: [],
      subtotal: 0,
      shippingCost: 0,
      discount: 0,
      total: 0,
      shippingAddress: {},
      dteId: "DTE-MOCK-ABCD1234",
      paymentMethodLabel: "Webpay (Demo)",
    });

    expect(result.html).toContain("Ana García");
  });

  it("rendered output contains item names", async () => {
    const { render } = await import("@/lib/notifications/templates/order-confirmation");

    const result = render({
      orderNumber: "PET-20260526-00001",
      customerName: "Test",
      items: [
        { name: "Cat Food Premium", qty: 1, lineTotal: 8000 },
        { name: "Dog Treat", qty: 3, lineTotal: 3000 },
      ],
      subtotal: 11000,
      shippingCost: 3990,
      discount: 0,
      total: 14990,
      shippingAddress: {},
      dteId: "DTE-MOCK-XYZ",
      paymentMethodLabel: "Webpay (Demo)",
    });

    expect(result.html).toContain("Cat Food Premium");
    expect(result.html).toContain("Dog Treat");
  });

  it("rendered output contains dteId reference", async () => {
    const { render } = await import("@/lib/notifications/templates/order-confirmation");

    const result = render({
      orderNumber: "PET-20260526-00001",
      customerName: "Test",
      items: [],
      subtotal: 0,
      shippingCost: 0,
      discount: 0,
      total: 0,
      shippingAddress: {},
      dteId: "DTE-MOCK-UNIQUE-XYZ",
      paymentMethodLabel: "Webpay (Demo)",
    });

    expect(result.html).toContain("DTE-MOCK-UNIQUE-XYZ");
  });
});
