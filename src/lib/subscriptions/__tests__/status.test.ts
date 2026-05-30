/**
 * T-08 [DOMAIN] status.ts — state machine transitions
 * SM-3..SM-8
 */
import { describe, it, expect } from "vitest";
import { assertValidTransition } from "../status";

describe("assertValidTransition (T-08, SM-3..SM-8)", () => {
  it("active → paused is valid", () => {
    expect(() => assertValidTransition("active", "paused")).not.toThrow();
  });

  it("active → cancelled is valid", () => {
    expect(() => assertValidTransition("active", "cancelled")).not.toThrow();
  });

  it("paused → active is valid (resume)", () => {
    expect(() => assertValidTransition("paused", "active")).not.toThrow();
  });

  it("paused → cancelled is valid", () => {
    expect(() => assertValidTransition("paused", "cancelled")).not.toThrow();
  });

  it("cancelled → active throws (terminal state)", () => {
    expect(() => assertValidTransition("cancelled", "active")).toThrow();
  });

  it("cancelled → paused throws (terminal state)", () => {
    expect(() => assertValidTransition("cancelled", "paused")).toThrow();
  });

  it("active → active is a no-op (does not throw)", () => {
    expect(() => assertValidTransition("active", "active")).not.toThrow();
  });

  it("paused → paused is a no-op (does not throw)", () => {
    expect(() => assertValidTransition("paused", "paused")).not.toThrow();
  });
});
