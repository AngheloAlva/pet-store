import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/app/actions/restock-alerts", () => ({
  cancelRestockAlert: vi.fn(async () => ({ ok: true })),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { cancelRestockAlert } from "@/app/actions/restock-alerts";
import CancelarPage from "./page";

const mockCancelRestockAlert = vi.mocked(cancelRestockAlert);

describe("CancelarPage (public RSC)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("(a) valid token → renders success message + alert canceled", async () => {
    mockCancelRestockAlert.mockResolvedValue({ ok: true });

    const jsx = await CancelarPage({ searchParams: Promise.resolve({ token: "tok-valid" }) });
    render(jsx);

    expect(screen.getByText(/alerta cancelada/i)).toBeInTheDocument();
    expect(mockCancelRestockAlert).toHaveBeenCalledWith({ kind: "token", token: "tok-valid" });
  });

  it("(b) invalid/missing token → renders error message", async () => {
    mockCancelRestockAlert.mockResolvedValue({ ok: false, error: "not_found" });

    const jsx = await CancelarPage({ searchParams: Promise.resolve({ token: "tok-bad" }) });
    render(jsx);

    expect(screen.getByText(/no se encontró/i)).toBeInTheDocument();
  });

  it("(c) already canceled token → renders 'ya cancelada' message", async () => {
    mockCancelRestockAlert.mockResolvedValue({ ok: false, error: "already_canceled" });

    const jsx = await CancelarPage({ searchParams: Promise.resolve({ token: "tok-done" }) });
    render(jsx);

    expect(screen.getByText(/ya estaba cancelada/i)).toBeInTheDocument();
  });

  it("(b) missing token (no searchParams) → renders error", async () => {
    const jsx = await CancelarPage({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByText(/no se encontró/i)).toBeInTheDocument();
  });
});
