/**
 * PaymentGateway port — F3.1
 * Isolates the payment integration seam so F3.2 can add real gateways
 * without touching checkout server actions.
 * Interface matches spec § 5.
 */

export interface PaymentGateway {
  readonly gatewayId: string;
  initiate(params: {
    amount: number;
    currency: "CLP";
    orderId: string;
    returnUrl: string;
  }): Promise<{ token: string; redirectUrl: string }>;
  verify(token: string): Promise<{ approved: boolean; authCode?: string }>;
}
