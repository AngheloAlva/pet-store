/**
 * Shipment delivered email template — F3.3 (Phase 8 full implementation)
 */

export interface Data {
  orderNumber: string;
  customerName: string;
}

export function render(data: Data) {
  return {
    subject: `Tu pedido ${data.orderNumber} fue entregado`,
    html: `<p>Hola ${data.customerName}, tu pedido ${data.orderNumber} fue entregado exitosamente.</p>`,
    text: `Hola ${data.customerName}, tu pedido ${data.orderNumber} fue entregado exitosamente.`,
  };
}
