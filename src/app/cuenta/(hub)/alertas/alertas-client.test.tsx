import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getCurrentUser } from "@/lib/session";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/app/actions/restock-alerts", () => ({
  cancelRestockAlert: vi.fn(async () => ({ ok: true })),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockGetCurrentUser = vi.mocked(getCurrentUser);


const pendingAlert = {
  id: "alert-1",
  email: "camila@demo.cl",
  userId: "user-camila-demo",
  productId: "prod-1",
  variantId: "var-1",
  storeIds: null,
  status: "pending" as const,
  cancelToken: "tok-1",
  createdAt: new Date("2026-01-15"),
  firedAt: null,
  canceledAt: null,
  productName: "Acana Pollo",
  variantName: "3kg",
};

const firedAlert = {
  ...pendingAlert,
  id: "alert-2",
  status: "fired" as const,
  firedAt: new Date("2026-01-20"),
  productName: "Hills Science Diet",
  variantName: "5kg",
};

import AlertasPage from "./page";
import { AlertasClient } from "./alertas-client";

describe("AlertasPage (RSC)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects unauthenticated user", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    await expect(AlertasPage()).rejects.toThrow(/REDIRECT/);
  });
});

describe("AlertasClient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("S-PUBLIC-1: renders only user's own alerts (2 rows)", () => {
    render(
      <AlertasClient
        alerts={[pendingAlert, firedAlert]}
      />,
    );

    // Both products should be visible
    expect(screen.getByText("Acana Pollo")).toBeInTheDocument();
    expect(screen.getByText("Hills Science Diet")).toBeInTheDocument();
  });

  it("shows correct status badges (Pendiente / Notificada)", () => {
    render(
      <AlertasClient
        alerts={[pendingAlert, firedAlert]}
      />,
    );

    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByText("Notificada")).toBeInTheDocument();
  });

  it("Cancelar button only on pending rows", () => {
    render(
      <AlertasClient
        alerts={[pendingAlert, firedAlert]}
      />,
    );

    const cancelButtons = screen.getAllByRole("button", { name: /cancelar/i });
    // Only 1 pending alert → 1 cancel button
    expect(cancelButtons).toHaveLength(1);
  });

  it("clicking Cancelar calls cancelRestockAlert", async () => {
    const user = userEvent.setup();
    const { cancelRestockAlert } = await import("@/app/actions/restock-alerts");
    const mockCancel = vi.mocked(cancelRestockAlert);

    render(
      <AlertasClient
        alerts={[pendingAlert]}
      />,
    );

    const cancelBtn = screen.getByRole("button", { name: /cancelar/i });
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(mockCancel).toHaveBeenCalledWith({ kind: "id", alertId: "alert-1" });
    });
  });
});
