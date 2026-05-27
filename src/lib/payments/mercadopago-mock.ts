/**
 * mercadopagoMock adapter — F3.2a
 * Simulates a MercadoPago-style checkout gateway. No network calls.
 * REJECT_TEST token always results in rejection.
 * Implements PaymentGateway interface.
 */
import type { PaymentGateway } from "./gateway";

export const MERCADOPAGO_INSTALLMENTS = [1, 3, 6, 12] as const;

export function perInstallmentCLP(total: number, n: number): number {
  return Math.round(total / n);
}

export const mercadopagoMock: PaymentGateway = {
  gatewayId: "mercadopago_mock",
  name: "MercadoPago (Demo)",

  async initiate(params: {
    amount: number;
    currency: "CLP";
    orderId: string;
    returnUrl: string;
  }): Promise<{ token: string; redirectUrl: string }> {
    const token = crypto.randomUUID();
    const redirectUrl = `${params.returnUrl}?token=${token}&mp=1`;
    return { token, redirectUrl };
  },

  async verify(token: string): Promise<{ approved: boolean; authCode?: string; reason?: string }> {
    if (token === "REJECT_TEST") {
      return { approved: false };
    }
    return { approved: true, authCode: `MP-MOCK-${token.slice(0, 8).toUpperCase()}` };
  },
};
