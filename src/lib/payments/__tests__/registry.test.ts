/**
 * Task 1.4 RED — Gateway registry test.
 * Asserts both webpay_mock and mercadopago_mock are registered.
 * Asserts getRegisteredGatewayIds() and getAllGateways() exports exist.
 * Task 3.1: schema duck-type test for checkoutSessions new columns.
 */
import { describe, it, expect } from "vitest";

describe("Gateway registry", () => {
  it("getGateway('mercadopago_mock') returns a gateway with non-empty name", async () => {
    const { getGateway } = await import("@/lib/payments/registry");
    const gw = getGateway("mercadopago_mock");
    expect(gw).toBeDefined();
    expect(gw.name).toBeTruthy();
    expect(gw.name.length).toBeGreaterThan(0);
  });

  it("getRegisteredGatewayIds() returns both webpay_mock and mercadopago_mock", async () => {
    const { getRegisteredGatewayIds } = await import("@/lib/payments/registry");
    const ids = getRegisteredGatewayIds();
    expect(ids).toContain("webpay_mock");
    expect(ids).toContain("mercadopago_mock");
  });

  it("getAllGateways() returns at least 2 entries", async () => {
    const { getAllGateways } = await import("@/lib/payments/registry");
    const gateways = getAllGateways();
    expect(gateways.length).toBeGreaterThanOrEqual(2);
    expect(gateways.every((g) => g.name && g.name.length > 0)).toBe(true);
  });
});

describe("Schema — checkoutSessions columns (Task 3.1)", () => {
  it("checkoutSessions table has paymentGateway and paymentMetadata fields", async () => {
    const { checkoutSessions } = await import("@/db/schema");
    // Duck-type check: Drizzle table columns are keyed by camelCase name
    expect("paymentGateway" in checkoutSessions).toBe(true);
    expect("paymentMetadata" in checkoutSessions).toBe(true);
  });
});
