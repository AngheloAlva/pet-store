/**
 * Task 0.1 RED — Schema test for F3.2b additions.
 * Asserts appSettings and transferReceipts tables exist on the drizzle schema object.
 * Asserts ORDER_PAYMENT_STATUS includes "pending_verification".
 */
import { describe, it, expect } from "vitest";

describe("Schema — F3.2b additions", () => {
  it("ORDER_PAYMENT_STATUS includes 'pending_verification'", async () => {
    const { ORDER_PAYMENT_STATUS } = await import("@/db/schema");
    expect(ORDER_PAYMENT_STATUS).toContain("pending_verification");
  });

  it("appSettings table exists on schema", async () => {
    const schema = await import("@/db/schema");
    expect("appSettings" in schema).toBe(true);
  });

  it("appSettings table has paymentFailureMode column", async () => {
    const { appSettings } = await import("@/db/schema");
    expect("paymentFailureMode" in appSettings).toBe(true);
  });

  it("transferReceipts table exists on schema", async () => {
    const schema = await import("@/db/schema");
    expect("transferReceipts" in schema).toBe(true);
  });

  it("transferReceipts table has orderId and dataUrl columns", async () => {
    const { transferReceipts } = await import("@/db/schema");
    expect("orderId" in transferReceipts).toBe(true);
    expect("dataUrl" in transferReceipts).toBe(true);
  });

  it("transferReceipts table has bankReference column", async () => {
    const { transferReceipts } = await import("@/db/schema");
    expect("bankReference" in transferReceipts).toBe(true);
  });
});
