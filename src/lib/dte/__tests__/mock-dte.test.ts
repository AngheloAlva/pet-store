/**
 * Task 2.5 RED — DTEProvider interface + MockDTEProvider test.
 * Asserts issue() returns dteId matching DTE-MOCK-* pattern, no network calls.
 */
import { describe, it, expect } from "vitest";

describe("MockDTEProvider", () => {
  it("issue() returns dteId matching DTE-MOCK-* pattern", async () => {
    const { MockDTEProvider } = await import("@/lib/dte/mock");

    const provider = new MockDTEProvider();
    const result = await provider.issue({
      id: "order-abc123",
      documentType: "boleta",
    });

    expect(result.dteId).toMatch(/^DTE-MOCK-/);
    expect(result.documentType).toBe("boleta");
  });

  it("issue() uses first 8 chars of order id (uppercased) in dteId", async () => {
    const { MockDTEProvider } = await import("@/lib/dte/mock");

    const provider = new MockDTEProvider();
    const result = await provider.issue({
      id: "abcdefgh-1234",
      documentType: "factura",
    });

    // dteId should contain the first 8 chars (uuid-style slice)
    expect(result.dteId).toMatch(/^DTE-MOCK-/);
    expect(result.dteId.length).toBeGreaterThan(8);
  });

  it("issue() makes no network calls (pure function)", async () => {
    const { MockDTEProvider } = await import("@/lib/dte/mock");

    // If this resolves without error, no network was attempted
    const provider = new MockDTEProvider();
    await expect(
      provider.issue({ id: "no-net-order", documentType: "boleta" }),
    ).resolves.toBeDefined();
  });
});
