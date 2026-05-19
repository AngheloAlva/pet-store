export interface Data {
  userName: string;
  delta: number;
  reason: string;
}

export function render(data: Data): { subject: string; html: string; text: string } {
  const sign = data.delta >= 0 ? "+" : "";
  const subject = `Ajuste de puntos — ${sign}${data.delta} puntos`;

  const text = [
    `Hola ${data.userName},`,
    "",
    `Se realizó un ajuste en tu cuenta de puntos.`,
    `Ajuste: ${sign}${data.delta} puntos`,
    `Motivo: ${data.reason}`,
    "",
    "Podés ver tu saldo actualizado en tu cuenta.",
  ].join("\n");

  const headerColor = data.delta >= 0 ? "#16a34a" : "#dc2626";
  const deltaColor = data.delta >= 0 ? "#16a34a" : "#dc2626";

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f9fafb; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; padding: 32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background: ${headerColor}; padding: 24px 32px;">
              <p style="color: #ffffff; font-size: 20px; font-weight: bold; margin: 0;">Ajuste de puntos</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="font-size: 16px; color: #111827; margin: 0 0 16px;">Hola <strong>${data.userName}</strong>,</p>
              <p style="font-size: 15px; color: #374151; margin: 0 0 24px;">Se realizó un ajuste en tu cuenta de puntos:</p>
              <table width="100%" cellpadding="8" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px;">
                <tr><td style="color: #6b7280; font-size: 13px;">Ajuste</td><td style="font-size: 18px; color: ${deltaColor}; font-weight: bold;">${sign}${data.delta} pts</td></tr>
                <tr style="background: #f9fafb;"><td style="color: #6b7280; font-size: 13px;">Motivo</td><td style="font-size: 14px; color: #111827;">${data.reason}</td></tr>
              </table>
              <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0;">Podés ver tu saldo actualizado en tu cuenta.</p>
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
