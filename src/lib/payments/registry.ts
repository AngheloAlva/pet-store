/**
 * Gateway registry — F3.1
 * Maps gatewayId → PaymentGateway implementation.
 * F3.2 registers additional gateways here without editing call-sites.
 */
import type { PaymentGateway } from "./gateway";
import { webpayMock } from "./webpay-mock";

const registry = new Map<string, PaymentGateway>();
registry.set("webpay_mock", webpayMock);

export function getGateway(gatewayId: string): PaymentGateway {
  const gateway = registry.get(gatewayId);
  if (!gateway) {
    throw new Error(`Payment gateway not registered: ${gatewayId}`);
  }
  return gateway;
}

export function registerGateway(gateway: PaymentGateway): void {
  registry.set(gateway.gatewayId, gateway);
}
