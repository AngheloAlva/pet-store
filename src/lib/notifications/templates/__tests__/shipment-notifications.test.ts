/**
 * Task 8.1 RED — shipment email template tests.
 * shipment_dispatched: contains orderNumber, trackingNumber, carrier.
 * shipment_delivered: contains orderNumber, customerName.
 * pickup_ready: contains orderNumber, storeName.
 */
import { describe, it, expect } from "vitest";

describe("shipment-dispatched template", () => {
  it("rendered output contains orderNumber and trackingNumber", async () => {
    const { render } = await import("@/lib/notifications/templates/shipment-dispatched");

    const result = render({
      orderNumber: "PET-20260527-00001",
      customerName: "Ana García",
      trackingNumber: "MOCK-ABC12345",
      carrier: "Chilexpress (demo)",
    });

    expect(result.html).toContain("PET-20260527-00001");
    expect(result.text).toContain("MOCK-ABC12345");
    expect(result.subject).toContain("PET-20260527-00001");
  });

  it("rendered output contains carrier name", async () => {
    const { render } = await import("@/lib/notifications/templates/shipment-dispatched");

    const result = render({
      orderNumber: "PET-20260527-00001",
      customerName: "Juan",
      trackingNumber: "MOCK-XYZ99999",
      carrier: "Starken (demo)",
    });

    expect(result.html).toContain("Starken");
    expect(result.text).toContain("Starken");
  });
});

describe("shipment-delivered template", () => {
  it("rendered output contains orderNumber and customerName", async () => {
    const { render } = await import("@/lib/notifications/templates/shipment-delivered");

    const result = render({
      orderNumber: "PET-20260527-00002",
      customerName: "María González",
    });

    expect(result.html).toContain("PET-20260527-00002");
    expect(result.text).toContain("María González");
    expect(result.subject).toContain("PET-20260527-00002");
  });
});

describe("pickup-ready template", () => {
  it("rendered output contains orderNumber and storeName", async () => {
    const { render } = await import("@/lib/notifications/templates/pickup-ready");

    const result = render({
      orderNumber: "PET-20260527-00003",
      customerName: "Carlos Pérez",
      storeName: "Providencia",
    });

    expect(result.html).toContain("PET-20260527-00003");
    expect(result.text).toContain("Providencia");
    expect(result.subject).toContain("PET-20260527-00003");
  });
});

describe("templates index includes shipment types", () => {
  it("TEMPLATES has shipment_dispatched, shipment_delivered, pickup_ready", async () => {
    const { TEMPLATES } = await import("@/lib/notifications/templates/index");
    expect(typeof TEMPLATES.shipment_dispatched).toBe("function");
    expect(typeof TEMPLATES.shipment_delivered).toBe("function");
    expect(typeof TEMPLATES.pickup_ready).toBe("function");
  });
});
