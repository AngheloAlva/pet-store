/**
 * Task 2.1 RED — PaymentGateway port + webpayMock adapter test.
 * Asserts initiate returns redirectUrl with /checkout/resultado,
 * verify('approve') → approved: true, verify('REJECT_TEST') → approved: false.
 * W1 fix: interface renamed to match spec § 5 (initiate/verify, gatewayId, token).
 */
import { describe, it, expect } from "vitest";

describe("webpayMock adapter", () => {
  it("initiate returns redirectUrl pointing to /checkout/resultado", async () => {
    const { webpayMock } = await import("@/lib/payments/webpay-mock");

    const result = await webpayMock.initiate({
      amount: 13990,
      currency: "CLP",
      orderId: "order-1",
      returnUrl: "/checkout/resultado",
    });

    expect(result.redirectUrl).toContain("/checkout/resultado");
    expect(result.token).toBeTruthy();
  });

  it("verify with approve token returns approved: true", async () => {
    const { webpayMock } = await import("@/lib/payments/webpay-mock");

    const initiated = await webpayMock.initiate({
      amount: 5000,
      currency: "CLP",
      orderId: "order-2",
      returnUrl: "/checkout/resultado",
    });

    const result = await webpayMock.verify(initiated.token);

    expect(result.approved).toBe(true);
  });

  it("verify with REJECT_TEST token returns approved: false", async () => {
    const { webpayMock } = await import("@/lib/payments/webpay-mock");

    const result = await webpayMock.verify("REJECT_TEST");

    expect(result.approved).toBe(false);
  });

  it("webpayMock.gatewayId is webpay_mock", async () => {
    const { webpayMock } = await import("@/lib/payments/webpay-mock");
    expect(webpayMock.gatewayId).toBe("webpay_mock");
  });
});
