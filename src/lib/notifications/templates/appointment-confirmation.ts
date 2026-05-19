export interface Data {
  serviceName: string;
  startsAt: Date;
  storeName: string;
  userName: string;
}

export function render(data: Data): { subject: string; html: string; text: string } {
  const dateStr = data.startsAt.toLocaleString("es-CL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  });

  const subject = `Confirmación de turno — ${data.serviceName}`;

  const text = [
    `Hola ${data.userName},`,
    "",
    `Tu turno ha sido confirmado.`,
    `Servicio: ${data.serviceName}`,
    `Fecha: ${dateStr}`,
    `Sucursal: ${data.storeName}`,
    "",
    "¡Te esperamos!",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f9fafb; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; padding: 32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background: #16a34a; padding: 24px 32px;">
              <p style="color: #ffffff; font-size: 20px; font-weight: bold; margin: 0;">Turno confirmado</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="font-size: 16px; color: #111827; margin: 0 0 16px;">Hola <strong>${data.userName}</strong>,</p>
              <p style="font-size: 15px; color: #374151; margin: 0 0 24px;">Tu turno ha sido confirmado con los siguientes detalles:</p>
              <table width="100%" cellpadding="8" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px;">
                <tr><td style="color: #6b7280; font-size: 13px;">Servicio</td><td style="font-size: 14px; color: #111827; font-weight: bold;">${data.serviceName}</td></tr>
                <tr style="background: #f9fafb;"><td style="color: #6b7280; font-size: 13px;">Fecha y hora</td><td style="font-size: 14px; color: #111827;">${dateStr}</td></tr>
                <tr><td style="color: #6b7280; font-size: 13px;">Sucursal</td><td style="font-size: 14px; color: #111827;">${data.storeName}</td></tr>
              </table>
              <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0;">¡Te esperamos!</p>
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
