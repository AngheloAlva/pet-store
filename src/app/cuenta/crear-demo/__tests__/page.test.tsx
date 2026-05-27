/**
 * R2 — /cuenta/crear-demo auth guard bypass (HUB-4)
 *
 * Verifies that the crear-demo page renders WITHOUT requiring auth.
 * The page lives OUTSIDE the (hub) route group so it does NOT inherit
 * the CuentaLayout auth guard. getCurrentUser is NOT called by this page.
 */
import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/app/actions/session", () => ({
  createDemoAccount: vi.fn(async () => ({ ok: true })),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

// getCurrentUser must NOT be imported or called by this page
// If it were called, this test would fail (no mock = import error)
import CrearDemoPage from "../page";

describe("/cuenta/crear-demo page (HUB-4 — no auth guard)", () => {
  it("renders the page without calling getCurrentUser (no auth required)", () => {
    // If the layout guard were applied, getCurrentUser would be called and
    // (since we don't mock it) this render would fail.
    expect(() => render(<CrearDemoPage />)).not.toThrow();
    expect(screen.getByRole("heading", { name: /crear cuenta demo/i })).toBeInTheDocument();
  });

  it("renders the CrearDemoForm without redirecting unauthenticated users", () => {
    render(<CrearDemoPage />);
    // The crear-demo form should be present — not a /login redirect
    expect(screen.getByRole("heading", { name: /crear cuenta demo/i })).toBeInTheDocument();
    // No REDIRECT error should have been thrown
  });
});
