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

describe("Gateway registry — withFailureMode wrapping (Task 5.4)", () => {
  it("getGateway('webpay_mock').verify is the wrapped function (not the original)", async () => {
    const { getGateway } = await import("@/lib/payments/registry");
    const { webpayMock } = await import("@/lib/payments/webpay-mock");
    const wrapped = getGateway("webpay_mock");
    // The wrapped verify should be a different function reference than the original
    expect(wrapped.verify).not.toBe(webpayMock.verify);
  });

  it("getGateway('transfer_mock').verify still throws (wrapper delegates to stub that throws)", async () => {
    const { setFailureInterceptorDeps, resetFailureInterceptorDeps } = await import(
      "@/lib/payments/failure-interceptor"
    );

    // Disable failure mode so wrapper passes through to the real verify (which throws)
    setFailureInterceptorDeps({ readFailureMode: async () => false });

    try {
      const { getGateway } = await import("@/lib/payments/registry");
      const wrapped = getGateway("transfer_mock");
      await expect(wrapped.verify("any-token")).rejects.toThrow(/must not be called/);
    } finally {
      resetFailureInterceptorDeps();
    }
  });
});

describe("Gateway registry — transfer_mock (Task 2.3)", () => {
  it("getGateway('transfer_mock') returns object with gatewayId === 'transfer_mock'", async () => {
    const { getGateway } = await import("@/lib/payments/registry");
    const gw = getGateway("transfer_mock");
    expect(gw).toBeDefined();
    expect(gw.gatewayId).toBe("transfer_mock");
  });

  it("getAllGateways() returns exactly 3 entries", async () => {
    const { getAllGateways } = await import("@/lib/payments/registry");
    const gateways = getAllGateways();
    expect(gateways).toHaveLength(3);
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
