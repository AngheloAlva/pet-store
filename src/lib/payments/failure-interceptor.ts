/**
 * failure-interceptor HOF — F3.2b
 * Wraps a PaymentGateway.verify() with optional random failure injection.
 * Used for demo/testing purposes: lets admins simulate gateway rejections.
 *
 * Design decisions:
 * - D4: Wrap point is getGateway() return — uniform interception, gateways stay pure.
 * - D5: Module-level deps object with setFailureInterceptorDeps() for testability.
 * - D6: readFailureMode() is called fresh on every verify() invocation — no caching.
 * - I-4: Only verify() is wrapped; initiate(), refund(), gatewayId, name pass through.
 */
import type { PaymentGateway } from "./gateway";

export interface FailureInterceptorDeps {
  random: () => number;
  readFailureMode: () => Promise<boolean>;
}

// Default deps — lazy import to avoid circular dependency risk at module load time.
const defaultDeps: FailureInterceptorDeps = {
  random: () => Math.random(),
  readFailureMode: async () => {
    // Lazy import to avoid circular dependency: failure-interceptor → settings → db → ...
    const { getAppSettings } = await import("@/app/actions/admin/settings");
    const settings = await getAppSettings();
    return settings.paymentFailureMode;
  },
};

let deps: FailureInterceptorDeps = { ...defaultDeps };

export function setFailureInterceptorDeps(partial: Partial<FailureInterceptorDeps>): void {
  deps = { ...deps, ...partial };
}

export function resetFailureInterceptorDeps(): void {
  deps = { ...defaultDeps };
}

/**
 * Wraps gateway.verify() with failure mode logic.
 * When paymentFailureMode is ON and random() < 0.1, returns a simulated failure.
 * Otherwise delegates to the original gateway.verify().
 * Only verify() is intercepted; all other gateway properties pass through unchanged (I-4).
 */
export function withFailureMode(gateway: PaymentGateway): PaymentGateway {
  return {
    ...gateway,
    verify: async (token: string) => {
      const enabled = await deps.readFailureMode();

      if (enabled && deps.random() < 0.1) {
        return { approved: false, reason: "simulated_failure" };
      }

      return gateway.verify(token);
    },
  };
}
