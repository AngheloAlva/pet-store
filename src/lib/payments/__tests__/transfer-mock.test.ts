/**
 * Task 2.1 RED — transfer-mock gateway test.
 * initiate() returns token with TRANSFER- prefix and redirectUrl: "".
 * verify() throws with message matching "must not be called".
 */
import { describe, it, expect } from "vitest";

describe("transferMock gateway", () => {
  it("gatewayId is 'transfer_mock'", async () => {
    const { transferMock } = await import("@/lib/payments/transfer-mock");
    expect(transferMock.gatewayId).toBe("transfer_mock");
  });

  it("name is non-empty", async () => {
    const { transferMock } = await import("@/lib/payments/transfer-mock");
    expect(transferMock.name.length).toBeGreaterThan(0);
  });

  it("initiate() returns token with TRANSFER- prefix and empty redirectUrl", async () => {
    const { transferMock } = await import("@/lib/payments/transfer-mock");
    const result = await transferMock.initiate({
      amount: 10000,
      currency: "CLP",
      orderId: "order-test-1",
      returnUrl: "https://example.com/resultado",
    });
    expect(result.token).toMatch(/^TRANSFER-/);
    expect(result.redirectUrl).toBe("");
  });

  it("verify() throws with message mentioning 'must not be called'", async () => {
    const { transferMock } = await import("@/lib/payments/transfer-mock");
    await expect(transferMock.verify("any-token")).rejects.toThrow(/must not be called/);
  });
});
