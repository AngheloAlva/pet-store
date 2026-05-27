/**
 * Task 5.1 RED — failure-interceptor HOF test.
 * paymentFailureMode=false → verify delegates to real gateway, returns { approved: true }.
 * paymentFailureMode=true + random()=0.05 → returns { approved: false, reason: "simulated_failure" }, real verify NOT called.
 * paymentFailureMode=true + random()=0.5 → delegates normally.
 * Reset deps in afterEach.
 */
import { describe, it, expect, vi, afterEach } from "vitest";

describe("withFailureMode HOF", () => {
  afterEach(async () => {
    const { resetFailureInterceptorDeps } = await import("@/lib/payments/failure-interceptor");
    resetFailureInterceptorDeps();
    vi.clearAllMocks();
  });

  it("failure mode OFF — verify delegates to real gateway, returns { approved: true }", async () => {
    const { withFailureMode, setFailureInterceptorDeps } = await import(
      "@/lib/payments/failure-interceptor"
    );

    const realVerify = vi.fn().mockResolvedValue({ approved: true, authCode: "MOCK-CODE" });
    const mockGateway = {
      gatewayId: "test_mock",
      name: "Test Mock",
      async initiate() { return { token: "tok", redirectUrl: "" }; },
      verify: realVerify,
    };

    setFailureInterceptorDeps({
      random: () => 0.05, // below 0.1 but mode is off
      readFailureMode: async () => false,
    });

    const wrapped = withFailureMode(mockGateway);
    const result = await wrapped.verify("some-token");

    expect(realVerify).toHaveBeenCalledWith("some-token");
    expect(result).toMatchObject({ approved: true });
  });

  it("failure mode ON + random()=0.05 → { approved: false, reason: 'simulated_failure' }, real verify NOT called", async () => {
    const { withFailureMode, setFailureInterceptorDeps } = await import(
      "@/lib/payments/failure-interceptor"
    );

    const realVerify = vi.fn().mockResolvedValue({ approved: true, authCode: "MOCK-CODE" });
    const mockGateway = {
      gatewayId: "test_mock",
      name: "Test Mock",
      async initiate() { return { token: "tok", redirectUrl: "" }; },
      verify: realVerify,
    };

    setFailureInterceptorDeps({
      random: () => 0.05, // < 0.1, triggers rejection
      readFailureMode: async () => true,
    });

    const wrapped = withFailureMode(mockGateway);
    const result = await wrapped.verify("some-token");

    expect(realVerify).not.toHaveBeenCalled();
    expect(result).toMatchObject({ approved: false, reason: "simulated_failure" });
  });

  it("failure mode ON + random()=0.5 → delegates normally to real verify", async () => {
    const { withFailureMode, setFailureInterceptorDeps } = await import(
      "@/lib/payments/failure-interceptor"
    );

    const realVerify = vi.fn().mockResolvedValue({ approved: true, authCode: "MOCK-CODE" });
    const mockGateway = {
      gatewayId: "test_mock",
      name: "Test Mock",
      async initiate() { return { token: "tok", redirectUrl: "" }; },
      verify: realVerify,
    };

    setFailureInterceptorDeps({
      random: () => 0.5, // >= 0.1, passes through
      readFailureMode: async () => true,
    });

    const wrapped = withFailureMode(mockGateway);
    const result = await wrapped.verify("some-token");

    expect(realVerify).toHaveBeenCalledWith("some-token");
    expect(result).toMatchObject({ approved: true });
  });
});
