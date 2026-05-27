/**
 * Task 1.1 RED — PaymentGateway interface widening test.
 * Asserts the interface has `name: string` and optional `refund?()`.
 * TS compilation is the test — if tsc --noEmit passes, the interface is correct.
 */
import { describe, it, expect } from "vitest";
import type { PaymentGateway, RefundResult } from "@/lib/payments/gateway";

describe("PaymentGateway interface contract", () => {
  it("accepts an object with name: string", () => {
    const mockGateway: PaymentGateway = {
      gatewayId: "test_gateway",
      name: "Test Gateway",
      async initiate() {
        return { token: "t", redirectUrl: "http://example.com" };
      },
      async verify() {
        return { approved: true };
      },
    };
    expect(mockGateway.name).toBe("Test Gateway");
  });

  it("RefundResult type has success and optional refundId", () => {
    const result: RefundResult = { success: true };
    expect(result.success).toBe(true);

    const resultWithId: RefundResult = { success: false, refundId: "ref-1" };
    expect(resultWithId.refundId).toBe("ref-1");
  });

  it("accepts optional refund method", () => {
    const gatewayWithRefund: PaymentGateway = {
      gatewayId: "test_refund",
      name: "Refund Gateway",
      async initiate() {
        return { token: "t", redirectUrl: "http://example.com" };
      },
      async verify() {
        return { approved: true };
      },
      async refund() {
        return { success: true };
      },
    };
    expect(typeof gatewayWithRefund.refund).toBe("function");
  });
});
