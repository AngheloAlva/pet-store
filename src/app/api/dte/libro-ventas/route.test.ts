/**
 * SEC-CSV-1 [RED→GREEN] — CSV formula injection neutralization
 * Spec: libro-ventas export must sanitize cells starting with = + - @ \t \r
 * to prevent spreadsheet formula injection when admin opens the CSV.
 */
import { describe, it, expect } from "vitest";
import { sanitizeCsvCell, buildCsvRow } from "@/lib/csv";

const CSV_HEADERS = [
  "folio",
  "tipo",
  "fecha",
  "rutReceptor",
  "razonSocial",
  "neto",
  "iva",
  "total",
];

describe("sanitizeCsvCell — formula injection neutralization", () => {
  it("prefixes '=' formula with a single quote", () => {
    expect(sanitizeCsvCell("=CMD()")).toBe("'=CMD()");
  });

  it("prefixes '+' with a single quote", () => {
    expect(sanitizeCsvCell("+1+1")).toBe("'+1+1");
  });

  it("prefixes '-' with a single quote", () => {
    expect(sanitizeCsvCell("-SUM(A1:A10)")).toBe("'-SUM(A1:A10)");
  });

  it("prefixes '@' with a single quote", () => {
    expect(sanitizeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("prefixes TAB (\\t) with a single quote", () => {
    expect(sanitizeCsvCell("\t dangerous")).toBe("'\t dangerous");
  });

  it("prefixes CR (\\r) with a single quote", () => {
    expect(sanitizeCsvCell("\r injection")).toBe("'\r injection");
  });

  it("does NOT modify a normal name (razonSocial)", () => {
    expect(sanitizeCsvCell("Juan Perez")).toBe("Juan Perez");
  });

  it("does NOT modify a plain number string", () => {
    expect(sanitizeCsvCell("12345")).toBe("12345");
  });

  it("does NOT modify a Chilean RUT", () => {
    expect(sanitizeCsvCell("12.345.678-9")).toBe("12.345.678-9");
  });

  it("does NOT modify an empty string", () => {
    expect(sanitizeCsvCell("")).toBe("");
  });
});

describe("buildCsvRow — formula-sanitize THEN CSV-quote", () => {
  it("formula cell that also contains a comma is both prefixed and quoted", () => {
    // razonSocial: "=cmd(),x"
    //   → sanitize: "'=cmd(),x"   (dangerous prefix → add single quote)
    //   → contains comma → CSV-wrap: "'=cmd(),x"  (double-quote wrapped)
    const row: Record<string, unknown> = {
      folio: "1",
      tipo: "33",
      fecha: "2026-01-01",
      rutReceptor: "12.345.678-9",
      razonSocial: "=cmd(),x",
      neto: "10000",
      iva: "1900",
      total: "11900",
    };
    const csv = buildCsvRow(row, CSV_HEADERS);
    expect(csv).toContain('"\'=cmd(),x"');
  });

  it("normal data row with a safe razonSocial is unchanged", () => {
    const row: Record<string, unknown> = {
      folio: "42",
      tipo: "33",
      fecha: "2026-05-01",
      rutReceptor: "76.543.210-K",
      razonSocial: "Empresa Ejemplo SpA",
      neto: "10000",
      iva: "1900",
      total: "11900",
    };
    const csv = buildCsvRow(row, CSV_HEADERS);
    expect(csv).toBe(
      "42,33,2026-05-01,76.543.210-K,Empresa Ejemplo SpA,10000,1900,11900"
    );
  });

  it("totals row with plain numeric values is untouched", () => {
    const row: Record<string, unknown> = {
      folio: "TOTALES",
      tipo: "",
      fecha: "",
      rutReceptor: "",
      razonSocial: "",
      neto: "84000",
      iva: "15960",
      total: "99960",
    };
    const csv = buildCsvRow(row, CSV_HEADERS);
    expect(csv).toBe("TOTALES,,,,,84000,15960,99960");
  });

  it("header row values (plain strings) are not modified", () => {
    const headerAsRow = Object.fromEntries(
      CSV_HEADERS.map((h) => [h, h])
    ) as Record<string, unknown>;
    const csv = buildCsvRow(headerAsRow, CSV_HEADERS);
    expect(csv).toBe(CSV_HEADERS.join(","));
  });
});
