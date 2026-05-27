/**
 * Mock courier providers (mock_chilexpress, mock_starken) — F3.3
 * Distinct rate tables; tracking number format MOCK-XXXXXXXX.
 */
import type { Carrier, CartLine, CarrierQuoteArgs } from "./registry";

export const MOCK_ITEM_WEIGHT_GRAMS = 1000;

type RegionKey = "RM" | "V" | "VI" | "VII" | "VIII" | "IX" | "X" | "XI" | "XII" | "XIV" | "XV" | "I" | "II" | "III" | "IV";

interface RateEntry {
  baseCost: number; // CLP fixed
  perKg: number;   // CLP per kg
}

// Chilexpress rate table (lower base, higher per-kg)
const CHILEXPRESS_RATE_TABLE: Record<string, RateEntry> = {
  RM:   { baseCost: 2490, perKg: 300 },
  V:    { baseCost: 2990, perKg: 400 },
  VI:   { baseCost: 3490, perKg: 450 },
  VII:  { baseCost: 3990, perKg: 500 },
  VIII: { baseCost: 3990, perKg: 500 },
  IX:   { baseCost: 4490, perKg: 600 },
  X:    { baseCost: 4990, perKg: 700 },
  XI:   { baseCost: 5990, perKg: 900 },
  XII:  { baseCost: 6990, perKg: 1100 },
  XIV:  { baseCost: 4990, perKg: 700 },
  XV:   { baseCost: 5490, perKg: 800 },
  I:    { baseCost: 5490, perKg: 800 },
  II:   { baseCost: 5490, perKg: 800 },
  III:  { baseCost: 4990, perKg: 650 },
  IV:   { baseCost: 4490, perKg: 550 },
};

// Starken rate table (higher base, lower per-kg — distinct from Chilexpress)
const STARKEN_RATE_TABLE: Record<string, RateEntry> = {
  RM:   { baseCost: 2990, perKg: 200 },
  V:    { baseCost: 3490, perKg: 300 },
  VI:   { baseCost: 3990, perKg: 350 },
  VII:  { baseCost: 4490, perKg: 400 },
  VIII: { baseCost: 4490, perKg: 400 },
  IX:   { baseCost: 4990, perKg: 500 },
  X:    { baseCost: 5490, perKg: 600 },
  XI:   { baseCost: 6490, perKg: 800 },
  XII:  { baseCost: 7490, perKg: 1000 },
  XIV:  { baseCost: 5490, perKg: 600 },
  XV:   { baseCost: 5990, perKg: 700 },
  I:    { baseCost: 5990, perKg: 700 },
  II:   { baseCost: 5990, perKg: 700 },
  III:  { baseCost: 5490, perKg: 550 },
  IV:   { baseCost: 4990, perKg: 450 },
};

const DEFAULT_REGION_ENTRY: RateEntry = { baseCost: 5990, perKg: 800 };
const DEFAULT_ESTIMATED_DAYS = 5;

function generateTrackingNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `MOCK-${suffix}`;
}

function buildCourier(
  id: "mock_chilexpress" | "mock_starken",
  label: string,
  rateTable: Record<string, RateEntry>,
): Carrier {
  return {
    id,
    label,
    async quote(args: CarrierQuoteArgs) {
      const items = args.items as CartLine[];
      const regionKey = (args.regionKey as string | undefined) ?? "RM";
      const totalWeightGrams = items.reduce(
        (sum, line) => sum + (line.quantity as number) * MOCK_ITEM_WEIGHT_GRAMS,
        0,
      );
      const totalWeightKg = totalWeightGrams / 1000;
      const rate = rateTable[regionKey as string] ?? DEFAULT_REGION_ENTRY;
      const cost = Math.round(rate.baseCost + rate.perKg * totalWeightKg);
      return { cost, estimatedDays: DEFAULT_ESTIMATED_DAYS };
    },
    generateTrackingNumber,
  };
}

export const mockChilexpress = buildCourier(
  "mock_chilexpress",
  "Chilexpress (Demo)",
  CHILEXPRESS_RATE_TABLE,
);

export const mockStarken = buildCourier(
  "mock_starken",
  "Starken (Demo)",
  STARKEN_RATE_TABLE,
);
