/**
 * transferMock adapter — F3.2b
 * Simulates a bank transfer gateway. No network calls.
 * verify() MUST NOT be called at checkout time — throws loudly if invoked.
 * Spec invariant I-3: transfer_mock.verify must not be called during checkout.
 * Implements PaymentGateway interface.
 */
import type { PaymentGateway } from "./gateway";

export const transferMock: PaymentGateway = {
  gatewayId: "transfer_mock",
  name: "Transferencia bancaria (Demo)",

  async initiate(params: {
    amount: number;
    currency: "CLP";
    orderId: string;
    returnUrl: string;
  }): Promise<{ token: string; redirectUrl: string }> {
    // Returns a synthetic token. The customer flow uses TransferMethod UI, not a redirect.
    return { token: `TRANSFER-${params.orderId}`, redirectUrl: "" };
  },

  async verify(_token: string): Promise<{ approved: boolean; authCode?: string; reason?: string }> {
    throw new Error(
      "transfer_mock.verify must not be called; transfers are confirmed by admin via confirmTransfer",
    );
  },
};
