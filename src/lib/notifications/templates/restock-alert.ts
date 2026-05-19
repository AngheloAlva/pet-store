export interface Data {
  productName: string;
  variantName?: string;
  storeName: string;
}

export function render(data: Data): { subject: string; html: string; text: string } {
  const productDisplay = data.variantName
    ? `${data.productName} — ${data.variantName}`
    : data.productName;

  const subject = `Reposición de stock — ${data.productName}`;

  const text = [
    `¡Buenas noticias!`,
    "",
    `El producto "${productDisplay}" está disponible nuevamente en ${data.storeName}.`,
    "",
    "Visitanos para conseguirlo.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f9fafb; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; padding: 32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background: #0891b2; padding: 24px 32px;">
              <p style="color: #ffffff; font-size: 20px; font-weight: bold; margin: 0;">Reposición de stock</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="font-size: 16px; color: #111827; margin: 0 0 16px;">¡Buenas noticias!</p>
              <p style="font-size: 15px; color: #374151; margin: 0 0 24px;">El producto que te interesaba está disponible nuevamente:</p>
              <table width="100%" cellpadding="8" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px;">
                <tr><td style="color: #6b7280; font-size: 13px;">Producto</td><td style="font-size: 14px; color: #111827; font-weight: bold;">${productDisplay}</td></tr>
                <tr style="background: #f9fafb;"><td style="color: #6b7280; font-size: 13px;">Sucursal</td><td style="font-size: 14px; color: #111827;">${data.storeName}</td></tr>
              </table>
              <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0;">Visitanos para conseguirlo.</p>
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
