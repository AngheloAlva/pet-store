/**
 * PaymentGateway port — F3.1 / widened in F3.2a
 * Isolates the payment integration seam so gateways can be added
 * without touching checkout server actions.
 * Interface matches spec § 5.
 */

export interface RefundResult {
  success: boolean;
  refundId?: string;
}

export interface PaymentGateway {
  readonly gatewayId: string;
  readonly name: string;
  initiate(params: {
    amount: number;
    currency: "CLP";
    orderId: string;
    returnUrl: string;
  }): Promise<{ token: string; redirectUrl: string }>;
  verify(token: string): Promise<{ approved: boolean; authCode?: string }>;
  refund?(paymentId: string, amount: number): Promise<RefundResult>;
}
