export interface Data {
  subject: string;
  html: string;
  text: string;
}

export function render(data: Data): { subject: string; html: string; text: string } {
  return { subject: data.subject, html: data.html, text: data.text };
}
