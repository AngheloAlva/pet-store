import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  useRouter: vi.fn(() => ({ refresh: vi.fn(), push: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(async () => ({
    id: "user-admin-demo",
    email: "admin@demo.cl",
    name: "Admin Demo",
    role: "admin",
    storeId: null,
    isDemoSeed: true,
  })),
}));

vi.mock("@/lib/admin/points", () => ({
  getUserPointsBalance: vi.fn(async () => 2500),
  getUserPointsHistory: vi.fn(async () => [
    {
      id: "tx-1",
      userId: "user-camila-demo",
      deltaPoints: 500,
      balanceAfter: 500,
      kind: "purchase",
      description: "Primera compra",
      createdAt: new Date("2026-01-20T10:00:00Z"),
    },
  ]),
}));

vi.mock("@/lib/admin/users", () => ({
  loadAdminUserRows: vi.fn(async () => [
    {
      id: "user-camila-demo",
      email: "camila@demo.cl",
      name: "Camila Rojas",
      role: "customer",
      storeId: null,
      isDemoSeed: true,
    },
  ]),
}));

vi.mock("@/app/actions/admin/points", () => ({
  addPointsTransaction: vi.fn(async () => ({ ok: true, balanceAfter: 2600 })),
  recordPresentialPurchase: vi.fn(async () => ({
    ok: true,
    finalBalance: 2850,
    transactionIds: ["tx-new"],
  })),
  triggerPetBirthdayBonuses: vi.fn(async () => ({
    ok: true,
    granted: ["pet-tobi-camila"],
    skipped: [],
  })),
}));

import PuntosAdminPage from "../page";

describe("PuntosAdminPage (/admin/puntos)", () => {
  it("redirects non-admin to / (role gate)", async () => {
    const { getCurrentUser } = await import("@/lib/session");
    vi.mocked(getCurrentUser).mockResolvedValueOnce({
      id: "user-camila-demo",
      email: "camila@demo.cl",
      name: "Camila Rojas",
      role: "customer",
      storeId: null,
      isDemoSeed: true,
    });

    await expect(PuntosAdminPage({ searchParams: {} })).rejects.toThrow(
      /REDIRECT:\//,
    );
  });

  it("renders puntos admin page without selected user (S-ADMIN-1 search UI)", async () => {
    const jsx = await PuntosAdminPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByText(/puntos/i)).toBeInTheDocument();
  });

  it("renders user balance when userId query param provided (S-ADMIN-1)", async () => {
    const jsx = await PuntosAdminPage({
      searchParams: { userId: "user-camila-demo" },
    });
    render(jsx);

    expect(screen.getByText("2500")).toBeInTheDocument();
  });

  it("renders birthday bonus button (S-ADMIN-2)", async () => {
    const jsx = await PuntosAdminPage({
      searchParams: { userId: "user-camila-demo" },
    });
    render(jsx);

    // The birthday bonus button should be present
    const buttons = screen.getAllByRole("button");
    const hasBirthdayButton = buttons.some((b) =>
      b.textContent?.toLowerCase().includes("cumpleaños"),
    );
    expect(hasBirthdayButton).toBe(true);
  });
});
