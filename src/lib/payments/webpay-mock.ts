/**
 * webpayMock adapter — F3.1
 * Simulates a Webpay-style redirect gateway. No network calls.
 * REJECT_TEST token always results in rejection.
 * Implements spec § 5 PaymentGateway interface.
 */
import type { PaymentGateway } from "./gateway";

export const webpayMock: PaymentGateway = {
  gatewayId: "webpay_mock",
  name: "WebPay (Demo)",

  async initiate(params: {
    amount: number;
    currency: "CLP";
    orderId: string;
    returnUrl: string;
  }): Promise<{ token: string; redirectUrl: string }> {
    const token = crypto.randomUUID();
    const redirectUrl = `${params.returnUrl}?token=${token}`;
    return { token, redirectUrl };
  },

  async verify(token: string): Promise<{ approved: boolean; authCode?: string }> {
    if (token === "REJECT_TEST") {
      return { approved: false };
    }
    return { approved: true, authCode: `WEBPAY-MOCK-${token.slice(0, 8).toUpperCase()}` };
  },
};
