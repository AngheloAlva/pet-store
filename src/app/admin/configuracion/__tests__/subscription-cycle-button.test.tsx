/**
 * T-31 [UI-ADMIN] Admin subscription cycle runner button
 * CY-7 — button renders, clicking calls runSubscriptionCycle, shows result counts
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockRunSubscriptionCycle = vi.fn();

vi.mock("@/app/actions/admin/subscriptions", () => ({
  runSubscriptionCycle: () => mockRunSubscriptionCycle(),
  sendSubscriptionReminders: vi.fn(() => Promise.resolve({ ok: true, sent: 0 })),
}));

import { SubscriptionCycleRunButton } from "../subscription-cycle-button";

describe("SubscriptionCycleRunButton (T-31)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the run cycle button", () => {
    render(<SubscriptionCycleRunButton />);
    expect(screen.getByRole("button", { name: /ejecutar ciclo/i })).toBeInTheDocument();
  });

  it("clicking the button calls runSubscriptionCycle action", async () => {
    mockRunSubscriptionCycle.mockResolvedValue({
      ok: true,
      result: { succeeded: 2, failed: 1, skipped: 3 },
    });
    const user = userEvent.setup();
    render(<SubscriptionCycleRunButton />);
    await user.click(screen.getByRole("button", { name: /ejecutar ciclo/i }));
    expect(mockRunSubscriptionCycle).toHaveBeenCalledOnce();
  });

  it("displays result summary after successful run", async () => {
    mockRunSubscriptionCycle.mockResolvedValue({
      ok: true,
      result: { succeeded: 2, failed: 1, skipped: 3 },
    });
    const user = userEvent.setup();
    render(<SubscriptionCycleRunButton />);
    await user.click(screen.getByRole("button", { name: /ejecutar ciclo/i }));
    // Result summary should show counts
    expect(screen.getByText(/2/)).toBeInTheDocument();
    expect(screen.getByText(/exitosas/i)).toBeInTheDocument();
  });

  it("displays error message on failure", async () => {
    mockRunSubscriptionCycle.mockResolvedValue({
      ok: false,
      code: "FORBIDDEN",
    });
    const user = userEvent.setup();
    render(<SubscriptionCycleRunButton />);
    await user.click(screen.getByRole("button", { name: /ejecutar ciclo/i }));
    expect(screen.getByText(/FORBIDDEN/i)).toBeInTheDocument();
  });
});
