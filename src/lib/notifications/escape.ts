/**
 * HTML-escape utilities for email templates.
 * Prevents XSS when user/admin-supplied values are interpolated into HTML.
 */

/**
 * Encodes the five characters that are dangerous in HTML attribute values
 * and text nodes: & < > " '
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Returns the URL only if it starts with http:// or https://.
 * Any other scheme (javascript:, data:, vbscript:, etc.) returns null.
 */
export function safeHttpUrl(url: string): string | null {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return null;
}
