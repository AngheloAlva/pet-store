/**
 * Shipment dispatched email template — F3.3 (Phase 8 full implementation)
 */

export interface Data {
  orderNumber: string;
  customerName: string;
  trackingNumber: string;
  carrier: string;
}

export function render(data: Data) {
  return {
    subject: `Tu pedido ${data.orderNumber} está en camino`,
    html: `<p>Hola ${data.customerName}, tu pedido ${data.orderNumber} ha sido despachado. Número de seguimiento: <strong>${data.trackingNumber}</strong> (${data.carrier}).</p>`,
    text: `Hola ${data.customerName}, tu pedido ${data.orderNumber} ha sido despachado. Número de seguimiento: ${data.trackingNumber} (${data.carrier}).`,
  };
}
