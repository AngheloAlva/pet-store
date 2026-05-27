/**
 * Task 5.1 RED — Architectural test.
 * confirm-order.ts MUST NOT import webpay-mock directly.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("confirm-order architectural constraint", () => {
  it("confirm-order.ts does NOT import webpay-mock", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/app/actions/checkout/confirm-order.ts"),
      "utf-8",
    );
    expect(source).not.toMatch(/webpay-mock/);
  });

  it("confirm-order.ts does NOT import mercadopago-mock directly", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/app/actions/checkout/confirm-order.ts"),
      "utf-8",
    );
    expect(source).not.toMatch(/mercadopago-mock/);
  });
});
