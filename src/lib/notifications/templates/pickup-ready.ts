/**
 * Pickup ready email template — F3.3 (Phase 8 full implementation)
 */

export interface Data {
  orderNumber: string;
  customerName: string;
  storeName: string;
}

export function render(data: Data) {
  return {
    subject: `Tu pedido ${data.orderNumber} está listo para retiro`,
    html: `<p>Hola ${data.customerName}, tu pedido ${data.orderNumber} está listo para retiro en <strong>${data.storeName}</strong>.</p>`,
    text: `Hola ${data.customerName}, tu pedido ${data.orderNumber} está listo para retiro en ${data.storeName}.`,
  };
}
