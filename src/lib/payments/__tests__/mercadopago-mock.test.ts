/**
 * Task 2.1 RED — mercadopagoMock gateway tests.
 * Scenarios: initiate returns token + redirectUrl; verify REJECT_TEST → false;
 * verify other → true; perInstallmentCLP math.
 */
import { describe, it, expect } from "vitest";

describe("mercadopagoMock gateway", () => {
  it("initiate() returns non-empty token and redirectUrl", async () => {
    const { mercadopagoMock } = await import("@/lib/payments/mercadopago-mock");
    const result = await mercadopagoMock.initiate({
      amount: 30000,
      currency: "CLP",
      orderId: "order-mp-1",
      returnUrl: "/checkout/resultado",
    });
    expect(result.token).toBeTruthy();
    expect(result.redirectUrl).toBeTruthy();
  });

  it("verify('REJECT_TEST') returns approved: false", async () => {
    const { mercadopagoMock } = await import("@/lib/payments/mercadopago-mock");
    const result = await mercadopagoMock.verify("REJECT_TEST");
    expect(result.approved).toBe(false);
  });

  it("verify(non-REJECT_TEST token) returns approved: true", async () => {
    const { mercadopagoMock } = await import("@/lib/payments/mercadopago-mock");
    const result = await mercadopagoMock.verify("some-valid-token");
    expect(result.approved).toBe(true);
  });

  it("perInstallmentCLP(30000, 3) returns 10000", async () => {
    const { perInstallmentCLP } = await import("@/lib/payments/mercadopago-mock");
    expect(perInstallmentCLP(30000, 3)).toBe(10000);
  });

  it("perInstallmentCLP(10000, 4) rounds correctly", async () => {
    const { perInstallmentCLP } = await import("@/lib/payments/mercadopago-mock");
    expect(perInstallmentCLP(10000, 4)).toBe(2500);
  });

  it("MERCADOPAGO_INSTALLMENTS is [1, 3, 6, 12]", async () => {
    const { MERCADOPAGO_INSTALLMENTS } = await import("@/lib/payments/mercadopago-mock");
    expect(Array.from(MERCADOPAGO_INSTALLMENTS)).toEqual([1, 3, 6, 12]);
  });
});
