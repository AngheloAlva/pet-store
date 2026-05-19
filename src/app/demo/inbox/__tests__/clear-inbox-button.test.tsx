import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/app/actions/demo/clear-inbox", () => ({
  clearInbox: vi.fn(async () => ({ ok: true, count: 0 })),
}));

describe("ClearInboxButton", () => {
  it("S-PUBLIC-4: button is enabled for admin", async () => {
    const { default: ClearInboxButton } = await import("../clear-inbox-button");
    render(<ClearInboxButton isAdmin={true} />);
    const btn = screen.getByRole("button");
    expect(btn).not.toBeDisabled();
  });

  it("S-PUBLIC-4: button is disabled with tooltip for non-admin", async () => {
    const { default: ClearInboxButton } = await import("../clear-inbox-button");
    render(<ClearInboxButton isAdmin={false} />);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
  });

  it("S-PUBLIC-4: tooltip text present for non-admin", async () => {
    const { default: ClearInboxButton } = await import("../clear-inbox-button");
    render(<ClearInboxButton isAdmin={false} />);
    expect(screen.getByTitle(/admin/i)).toBeDefined();
  });
});
