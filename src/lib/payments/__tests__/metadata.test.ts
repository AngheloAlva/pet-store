/**
 * Task 2.3 RED — paymentMetadataSchema Zod parse round-trip tests.
 */
import { describe, it, expect } from "vitest";

describe("paymentMetadataSchema", () => {
  it("parses webpay kind correctly", async () => {
    const { paymentMetadataSchema } = await import("@/lib/payments/metadata");
    const result = paymentMetadataSchema.parse({ kind: "webpay" });
    expect(result.kind).toBe("webpay");
  });

  it("parses mercadopago kind with installments correctly", async () => {
    const { paymentMetadataSchema } = await import("@/lib/payments/metadata");
    const result = paymentMetadataSchema.parse({
      kind: "mercadopago",
      installments: 3,
      installmentValue: 10000,
    });
    expect(result.kind).toBe("mercadopago");
    if (result.kind === "mercadopago") {
      expect(result.installments).toBe(3);
      expect(result.installmentValue).toBe(10000);
    }
  });

  it("fails parse for unknown shape", async () => {
    const { paymentMetadataSchema } = await import("@/lib/payments/metadata");
    expect(() => paymentMetadataSchema.parse({ kind: "unknown" })).toThrow();
  });

  it("fails parse for mercadopago with invalid installments", async () => {
    const { paymentMetadataSchema } = await import("@/lib/payments/metadata");
    expect(() =>
      paymentMetadataSchema.parse({ kind: "mercadopago", installments: 5, installmentValue: 6000 }),
    ).toThrow();
  });
});
