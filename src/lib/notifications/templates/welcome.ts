export interface Data {
  userName: string;
}

export function render(data: Data): { subject: string; html: string; text: string } {
  const subject = `¡Bienvenida, ${data.userName}!`;

  const text = [
    `Hola ${data.userName},`,
    "",
    "¡Bienvenida a nuestra tienda!",
    "",
    "Ahora podés agendar turnos, acumular puntos con tus compras y mucho más.",
    "",
    "¡Nos alegra tenerte acá!",
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
              <p style="color: #ffffff; font-size: 20px; font-weight: bold; margin: 0;">¡Bienvenida!</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="font-size: 16px; color: #111827; margin: 0 0 16px;">Hola <strong>${data.userName}</strong>,</p>
              <p style="font-size: 15px; color: #374151; margin: 0 0 16px;">¡Bienvenida a nuestra tienda!</p>
              <p style="font-size: 15px; color: #374151; margin: 0 0 24px;">Ahora podés agendar turnos, acumular puntos con tus compras y mucho más.</p>
              <p style="font-size: 14px; color: #6b7280; margin: 0;">¡Nos alegra tenerte acá!</p>
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
