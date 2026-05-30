/**
 * order_confirmation email template — F3.1
 * Pure function: no React, no DB, no side effects.
 */

export interface Data {
  orderNumber: string;
  customerName: string;
  items: Array<{ name: string; qty: number; lineTotal: number }>;
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  shippingAddress: Record<string, string | number | undefined>;
  dteId: string;
  pdfUrl?: string;
  paymentMethodLabel: string;
}

function formatCLP(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}

export function render(data: Data): { subject: string; html: string; text: string } {
  const subject = `Pedido confirmado — ${data.orderNumber}`;

  const itemsText = data.items
    .map((i) => `  - ${i.name} x${i.qty}: ${formatCLP(i.lineTotal)}`)
    .join("\n");

  const addressStr = [
    data.shippingAddress.street,
    data.shippingAddress.number,
    data.shippingAddress.commune,
  ]
    .filter(Boolean)
    .join(", ");

  const text = [
    `Hola ${data.customerName},`,
    "",
    `¡Tu pedido ha sido confirmado!`,
    "",
    `Número de pedido: ${data.orderNumber}`,
    `DTE / Boleta: ${data.dteId}`,
    data.pdfUrl ? `Descargar DTE: ${data.pdfUrl}` : "",
    `Método de pago: ${data.paymentMethodLabel}`,
    "",
    "Productos:",
    itemsText,
    "",
    `Subtotal: ${formatCLP(data.subtotal)}`,
    `Despacho: ${formatCLP(data.shippingCost)}`,
    data.discount > 0 ? `Descuento: -${formatCLP(data.discount)}` : "",
    `Total: ${formatCLP(data.total)}`,
    "",
    `Dirección de envío: ${addressStr}`,
    "",
    "¡Gracias por tu compra!",
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  const itemsHtml = data.items
    .map(
      (i) =>
        `<tr><td style="padding: 8px; color: #374151;">${i.name} x${i.qty}</td><td style="padding: 8px; text-align: right; color: #374151;">${formatCLP(i.lineTotal)}</td></tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f9fafb; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; padding: 32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background: #16a34a; padding: 24px 32px;">
              <p style="color: #ffffff; font-size: 20px; font-weight: bold; margin: 0;">Pedido confirmado</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="font-size: 16px; color: #111827; margin: 0 0 16px;">Hola <strong>${data.customerName}</strong>,</p>
              <p style="font-size: 15px; color: #374151; margin: 0 0 8px;">¡Tu pedido ha sido confirmado!</p>
              <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">Número de pedido: <strong>${data.orderNumber}</strong></p>

              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 24px;">
                <tr style="background: #f9fafb;">
                  <th style="padding: 8px; text-align: left; font-size: 13px; color: #6b7280;">Producto</th>
                  <th style="padding: 8px; text-align: right; font-size: 13px; color: #6b7280;">Total</th>
                </tr>
                ${itemsHtml}
                <tr style="border-top: 1px solid #e5e7eb;">
                  <td style="padding: 8px; color: #6b7280; font-size: 13px;">Subtotal</td>
                  <td style="padding: 8px; text-align: right; color: #374151;">${formatCLP(data.subtotal)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; color: #6b7280; font-size: 13px;">Despacho</td>
                  <td style="padding: 8px; text-align: right; color: #374151;">${formatCLP(data.shippingCost)}</td>
                </tr>
                <tr style="background: #f0fdf4;">
                  <td style="padding: 8px; font-weight: bold; color: #111827;">Total</td>
                  <td style="padding: 8px; text-align: right; font-weight: bold; color: #16a34a;">${formatCLP(data.total)}</td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #6b7280; margin: 0 0 8px;">Dirección de envío: ${addressStr}</p>
              <p style="font-size: 13px; color: #6b7280; margin: 0 0 8px;">Método de pago: ${data.paymentMethodLabel}</p>
              <p style="font-size: 13px; color: #6b7280; margin: 0 0 8px;">DTE / Boleta: <strong>${data.dteId}</strong></p>
              ${data.pdfUrl ? `<p style="margin: 0 0 24px;"><a href="${data.pdfUrl}" style="font-size: 13px; color: #16a34a; text-decoration: underline;">Descargar DTE</a></p>` : '<p style="margin: 0 0 24px;"></p>'}

              <p style="font-size: 14px; color: #6b7280; margin: 0;">¡Gracias por tu compra!</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
