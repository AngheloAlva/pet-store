/**
 * T-28 [UI-CUENTA] Subscription management island
 * SM-S5..SM-S11 — pause, resume, cancel, adelantar
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Subscription } from "@/db/schema";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

const mockPauseSubscription = vi.fn();
const mockResumeSubscription = vi.fn();
const mockCancelSubscription = vi.fn();
const mockChangeFrequency = vi.fn();

vi.mock("@/app/actions/cuenta/suscripciones", () => ({
  pauseSubscription: (...args: unknown[]) => mockPauseSubscription(...args),
  resumeSubscription: (...args: unknown[]) => mockResumeSubscription(...args),
  cancelSubscription: (...args: unknown[]) => mockCancelSubscription(...args),
  changeFrequency: (...args: unknown[]) => mockChangeFrequency(...args),
  changeVariant: vi.fn(),
}));

import { SuscripcionesClient } from "../suscripciones-client";

const activeSub: Subscription = {
  id: "sub-mgmt-1",
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
  id: "sub-mgmt-2",
  status: "paused",
};

describe("SuscripcionesClient (T-28)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders pause button for active subscription", () => {
    render(<SuscripcionesClient subscriptions={[activeSub]} />);
    expect(screen.getByRole("button", { name: /pausar/i })).toBeInTheDocument();
  });

  it("renders resume button for paused subscription", () => {
    render(<SuscripcionesClient subscriptions={[pausedSub]} />);
    expect(screen.getByRole("button", { name: /reanudar/i })).toBeInTheDocument();
  });

  it("renders cancel button for active subscription", () => {
    render(<SuscripcionesClient subscriptions={[activeSub]} />);
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
  });

  it("pause button calls pauseSubscription action", async () => {
    mockPauseSubscription.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<SuscripcionesClient subscriptions={[activeSub]} />);
    await user.click(screen.getByRole("button", { name: /pausar/i }));
    expect(mockPauseSubscription).toHaveBeenCalledWith("sub-mgmt-1", expect.any(Object));
  });

  it("resume button calls resumeSubscription action", async () => {
    mockResumeSubscription.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<SuscripcionesClient subscriptions={[pausedSub]} />);
    await user.click(screen.getByRole("button", { name: /reanudar/i }));
    expect(mockResumeSubscription).toHaveBeenCalledWith("sub-mgmt-2");
  });

  it("cancel button calls cancelSubscription action", async () => {
    mockCancelSubscription.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<SuscripcionesClient subscriptions={[activeSub]} />);
    await user.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(mockCancelSubscription).toHaveBeenCalledWith("sub-mgmt-1");
  });
});
