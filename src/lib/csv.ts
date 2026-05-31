/**
 * CSV utility helpers — shared across CSV export routes.
 *
 * Security: sanitizeCsvCell neutralizes formula injection (CSV injection / OWASP).
 * Any cell value starting with = + - @ TAB CR is prefixed with a single quote
 * so spreadsheet applications (Excel, Sheets) treat it as text, not a formula.
 *
 * Apply BEFORE CSV-quoting so the prefix is preserved inside quoted fields too.
 */

/**
 * Neutralizes spreadsheet formula injection by prefixing dangerous first
 * characters with a single quote.
 *
 * Dangerous prefixes: = + - @ \t \r
 */
export function sanitizeCsvCell(str: string): string {
  if (str.length > 0 && /^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

/**
 * Converts a record to a CSV row string given an ordered list of column keys.
 * Formula-sanitizes FIRST, then applies standard CSV quoting.
 */
export function buildCsvRow(
  row: Record<string, unknown>,
  headers: string[]
): string {
  return headers
    .map((col) => {
      const safe = sanitizeCsvCell(String(row[col] ?? ""));
      if (
        safe.includes(",") ||
        safe.includes('"') ||
        safe.includes("\n")
      ) {
        return `"${safe.replace(/"/g, '""')}"`;
      }
      return safe;
    })
    .join(",");
}
