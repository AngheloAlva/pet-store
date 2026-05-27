/**
 * Gateway registry — F3.1 / extended in F3.2a
 * Maps gatewayId → PaymentGateway implementation.
 * Adding a gateway = import + registerGateway() call here.
 */
import type { PaymentGateway } from "./gateway";
import { webpayMock } from "./webpay-mock";
import { mercadopagoMock } from "./mercadopago-mock";
import { transferMock } from "./transfer-mock";

const registry = new Map<string, PaymentGateway>();

registry.set(webpayMock.gatewayId, webpayMock);
registry.set(mercadopagoMock.gatewayId, mercadopagoMock);
registry.set(transferMock.gatewayId, transferMock);

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

export function getRegisteredGatewayIds(): string[] {
  return Array.from(registry.keys());
}

export function getAllGateways(): PaymentGateway[] {
  return Array.from(registry.values());
}
