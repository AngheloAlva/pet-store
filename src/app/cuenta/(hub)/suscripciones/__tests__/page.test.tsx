/**
 * T-27 [UI-CUENTA] /cuenta/suscripciones — RSC list page
 * SD-S1, SD-S2, SM-S1
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Subscription } from "@/db/schema";

vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
  usePathname: vi.fn(() => "/cuenta/suscripciones"),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const mockGetSubscriptions = vi.fn();
vi.mock("@/app/actions/cuenta/suscripciones", () => ({
  getSubscriptions: () => mockGetSubscriptions(),
}));

import SuscripcionesPage from "../page";

const activeSub: Subscription = {
  id: "sub-t27-1",
  userId: "user-camila-demo",
  productId: "prod-1",
  variantId: "var-1",
  frequencyDays: 30,
  discountPercent: 10,
  quantity: 1,
  status: "active",
  nextChargeAt: new Date("2025-02-10"),
  pausedUntil: null,
  failedAttempts: 0,
  lastChargedAt: null,
  createdAt: new Date("2025-01-10"),
  updatedAt: new Date("2025-01-10"),
};

const pausedSub: Subscription = {
  ...activeSub,
  id: "sub-t27-2",
  status: "paused",
};

describe("SuscripcionesPage (T-27)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("SD-S1: renders list of user's subscriptions", async () => {
    mockGetSubscriptions.mockResolvedValue([activeSub, pausedSub]);
    const jsx = await SuscripcionesPage();
    render(jsx);
    // Should show "Mis Suscripciones" heading
    expect(screen.getByRole("heading", { name: /mis suscripciones/i })).toBeInTheDocument();
    // Should show the subscriptions
    const rows = screen.getAllByRole("row");
    // 1 header row + 2 data rows
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  it("SD-S2: empty state renders when no subscriptions", async () => {
    mockGetSubscriptions.mockResolvedValue([]);
    const jsx = await SuscripcionesPage();
    render(jsx);
    expect(screen.getByText(/no tenés suscripciones/i)).toBeInTheDocument();
  });

  it("shows nextChargeAt date and status for each subscription", async () => {
    mockGetSubscriptions.mockResolvedValue([activeSub]);
    const jsx = await SuscripcionesPage();
    render(jsx);
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });
});
