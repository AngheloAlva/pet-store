/**
 * Task 4.1 RED — initiate-payment schema tests.
 * Valid gateways pass; unknown gateway fails; installments validated.
 */
import { describe, it, expect } from "vitest";

describe("initiatePaymentSchema", () => {
  it("accepts webpay_mock gateway", async () => {
    const { initiatePaymentSchema } = await import(
      "@/app/actions/checkout/initiate-payment.schema"
    );
    const result = initiatePaymentSchema.safeParse({
      sessionId: "00000000-0000-0000-0000-000000000001",
      gateway: "webpay_mock",
    });
    expect(result.success).toBe(true);
  });

  it("accepts mercadopago_mock gateway", async () => {
    const { initiatePaymentSchema } = await import(
      "@/app/actions/checkout/initiate-payment.schema"
    );
    const result = initiatePaymentSchema.safeParse({
      sessionId: "00000000-0000-0000-0000-000000000002",
      gateway: "mercadopago_mock",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown gateway 'paypal'", async () => {
    const { initiatePaymentSchema } = await import(
      "@/app/actions/checkout/initiate-payment.schema"
    );
    const result = initiatePaymentSchema.safeParse({
      sessionId: "00000000-0000-0000-0000-000000000003",
      gateway: "paypal",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid installments: 3", async () => {
    const { initiatePaymentSchema } = await import(
      "@/app/actions/checkout/initiate-payment.schema"
    );
    const result = initiatePaymentSchema.safeParse({
      sessionId: "00000000-0000-0000-0000-000000000004",
      gateway: "mercadopago_mock",
      installments: 3,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid installments: 5", async () => {
    const { initiatePaymentSchema } = await import(
      "@/app/actions/checkout/initiate-payment.schema"
    );
    const result = initiatePaymentSchema.safeParse({
      sessionId: "00000000-0000-0000-0000-000000000005",
      gateway: "mercadopago_mock",
      installments: 5,
    });
    expect(result.success).toBe(false);
  });
});
