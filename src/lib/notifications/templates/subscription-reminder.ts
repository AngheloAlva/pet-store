/**
 * subscription_reminder email template — F3.5
 * Pure function: no React, no DB, no side effects.
 */

export interface Data {
  userName: string;
  productName: string;
  variantName?: string;
  frequencyDays: number;
  nextChargeAt: Date | string;
  discountedPrice: number;
  manageUrl?: string;
}

function formatCLP(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
}

export function render(data: Data): { subject: string; html: string; text: string } {
  const subject = `Recordatorio: tu suscripción de ${data.productName} se cobra el ${formatDate(data.nextChargeAt)}`;

  const text = [
    `Hola ${data.userName},`,
    "",
    `Te recordamos que tu suscripción de ${data.productName} se cobrará próximamente.`,
    "",
    `Fecha de cobro: ${formatDate(data.nextChargeAt)}`,
    `Frecuencia: Cada ${data.frequencyDays} días`,
    `Precio con descuento: ${formatCLP(data.discountedPrice)}`,
    "",
    data.manageUrl ? `Gestiona tu suscripción en: ${data.manageUrl}` : "",
    "",
    "¡Gracias por tu preferencia!",
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f9fafb; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; padding: 32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background: #2563eb; padding: 24px 32px;">
              <p style="color: #ffffff; font-size: 20px; font-weight: bold; margin: 0;">Recordatorio de suscripción</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="font-size: 16px; color: #111827; margin: 0 0 16px;">Hola <strong>${data.userName}</strong>,</p>
              <p style="font-size: 15px; color: #374151; margin: 0 0 8px;">Tu suscripción de <strong>${data.productName}</strong> se cobrará próximamente.</p>
              <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px;">Fecha de cobro: <strong>${formatDate(data.nextChargeAt)}</strong></p>
              <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px;">Frecuencia: Cada ${data.frequencyDays} días</p>
              <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">Precio con descuento: <strong>${formatCLP(data.discountedPrice)}</strong></p>
              ${data.manageUrl ? `<p style="font-size: 14px; color: #374151;"><a href="${data.manageUrl}" style="color: #2563eb;">Gestionar suscripción</a></p>` : ""}
              <p style="font-size: 14px; color: #6b7280; margin: 0;">¡Gracias por tu preferencia!</p>
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
