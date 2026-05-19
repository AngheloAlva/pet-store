import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  useRouter: vi.fn(() => ({ refresh: vi.fn(), push: vi.fn() })),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(async () => ({
    id: "user-camila-demo",
    email: "camila@demo.cl",
    name: "Camila Rojas",
    role: "customer",
    storeId: null,
    isDemoSeed: true,
  })),
}));

vi.mock("@/lib/admin/points", () => ({
  getUserPointsBalance: vi.fn(async () => 2500),
  getUserPointsHistory: vi.fn(async () => [
    {
      id: "tx-9",
      userId: "user-camila-demo",
      deltaPoints: 200,
      balanceAfter: 2500,
      kind: "pet_birthday_bonus",
      description: "Bono cumpleaños Tobi",
      createdAt: new Date("2026-05-01T10:00:00Z"),
    },
    {
      id: "tx-8",
      userId: "user-camila-demo",
      deltaPoints: 350,
      balanceAfter: 2300,
      kind: "purchase",
      description: "Compra presencial",
      createdAt: new Date("2026-04-15T10:00:00Z"),
    },
    {
      id: "tx-7",
      userId: "user-camila-demo",
      deltaPoints: 500,
      balanceAfter: 1950,
      kind: "first_purchase_bonus",
      description: "Bono primera compra",
      createdAt: new Date("2026-04-15T10:00:00Z"),
    },
  ]),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [
          {
            id: "singleton",
            earnRatePerCLP: 100,
            redeemValuePerPoint: 1,
            minRedeemPoints: 500,
            firstPurchaseBonus: 500,
            petBirthdayBonus: 200,
          },
        ]),
      })),
    })),
  },
  dbReady: Promise.resolve(),
}));

import PuntosPage from "../page";

describe("PuntosPage (/cuenta/puntos)", () => {
  it("shows balance of 2500 prominently (S-PUBLIC-1)", async () => {
    const jsx = await PuntosPage();
    render(jsx);

    expect(screen.getByText("2500")).toBeInTheDocument();
  });

  it("shows transactions list", async () => {
    const jsx = await PuntosPage();
    render(jsx);

    const elements = screen.getAllByText(/cumpleaños/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it("redirects when not authenticated", async () => {
    const { getCurrentUser } = await import("@/lib/session");
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    await expect(PuntosPage()).rejects.toThrow(/REDIRECT/);
  });

  it("shows 'Puntos disponibles' label", async () => {
    const jsx = await PuntosPage();
    render(jsx);

    expect(screen.getByText(/puntos disponibles/i)).toBeInTheDocument();
  });
});
