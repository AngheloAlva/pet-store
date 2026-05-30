/**
 * subscription_payment_failed email template — F3.5
 * Pure function: no React, no DB, no side effects.
 */

export interface Data {
  userName: string;
  productName: string;
  failureReason?: string;
}

export function render(data: Data): { subject: string; html: string; text: string } {
  const subject = `Problema con el cobro de tu suscripción de ${data.productName}`;

  const text = [
    `Hola ${data.userName},`,
    "",
    `Lamentablemente no pudimos procesar el cobro de tu suscripción de ${data.productName}.`,
    "",
    "Próximos pasos:",
    "- Verifica que tu método de pago sea válido.",
    "- Contacta a soporte si el problema persiste.",
    "",
    "Tu suscripción ha sido pausada temporalmente. Puedes reactivarla desde tu cuenta.",
    "",
    "¡Gracias por tu comprensión!",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f9fafb; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; padding: 32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background: #dc2626; padding: 24px 32px;">
              <p style="color: #ffffff; font-size: 20px; font-weight: bold; margin: 0;">Problema con tu suscripción</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="font-size: 16px; color: #111827; margin: 0 0 16px;">Hola <strong>${data.userName}</strong>,</p>
              <p style="font-size: 15px; color: #374151; margin: 0 0 8px;">Lamentablemente no pudimos procesar el cobro de tu suscripción de <strong>${data.productName}</strong>.</p>
              <p style="font-size: 14px; color: #6b7280; margin: 0 0 16px;">Tu suscripción ha sido pausada temporalmente.</p>
              <p style="font-size: 14px; color: #374151; margin: 0 0 8px;"><strong>Próximos pasos:</strong></p>
              <ul style="font-size: 14px; color: #374151; margin: 0 0 24px; padding-left: 20px;">
                <li>Verifica que tu método de pago sea válido.</li>
                <li>Contacta a soporte si el problema persiste.</li>
              </ul>
              <p style="font-size: 14px; color: #6b7280; margin: 0;">¡Gracias por tu comprensión!</p>
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
