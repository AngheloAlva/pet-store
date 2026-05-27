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

  it("parses transfer kind with bankReference and receiptId correctly", async () => {
    const { paymentMetadataSchema } = await import("@/lib/payments/metadata");
    const result = paymentMetadataSchema.safeParse({
      kind: "transfer",
      bankReference: "REF-001",
      receiptId: "rcpt_abc",
    });
    expect(result.success).toBe(true);
  });

  it("fails parse for transfer kind without bankReference", async () => {
    const { paymentMetadataSchema } = await import("@/lib/payments/metadata");
    const result = paymentMetadataSchema.safeParse({
      kind: "transfer",
      receiptId: "rcpt_abc",
    });
    expect(result.success).toBe(false);
  });

  it("fails parse for { kind: 'cash' } — unknown kind", async () => {
    const { paymentMetadataSchema } = await import("@/lib/payments/metadata");
    const result = paymentMetadataSchema.safeParse({ kind: "cash" });
    expect(result.success).toBe(false);
  });

  it("fails parse for mercadopago with invalid installments", async () => {
    const { paymentMetadataSchema } = await import("@/lib/payments/metadata");
    expect(() =>
      paymentMetadataSchema.parse({ kind: "mercadopago", installments: 5, installmentValue: 6000 }),
    ).toThrow();
  });
});
