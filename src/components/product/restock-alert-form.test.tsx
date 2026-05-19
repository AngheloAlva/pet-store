import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/app/actions/restock-alerts", () => ({
  createRestockAlert: vi.fn(async () => ({ ok: true, alertId: "alert-id", cancelToken: "tok-1" })),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { RestockAlertForm } from "./restock-alert-form";
import { createRestockAlert } from "@/app/actions/restock-alerts";

const mockCreateRestockAlert = vi.mocked(createRestockAlert);

describe("RestockAlertForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRestockAlert.mockResolvedValue({ ok: true, alertId: "alert-id", cancelToken: "tok-1" });
  });

  it("(a) authenticated mode — renders confirm button, no email input", () => {
    render(
      <RestockAlertForm
        productId="prod-1"
        variantId="var-1"
        isAuthenticated={true}
        userEmail="user@example.com"
      />,
    );

    const button = screen.getByRole("button", { name: /avisame/i });
    expect(button).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /email/i })).not.toBeInTheDocument();
  });

  it("(b) anonymous mode — renders email input + button", () => {
    render(
      <RestockAlertForm
        productId="prod-1"
        isAuthenticated={false}
      />,
    );

    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("(c) on success, form replaced with confirmation message", async () => {
    const user = userEvent.setup();
    render(
      <RestockAlertForm
        productId="prod-1"
        variantId="var-1"
        isAuthenticated={true}
        userEmail="user@example.com"
      />,
    );

    const button = screen.getByRole("button", { name: /avisame/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/te avisaremos/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /avisame/i })).not.toBeInTheDocument();
  });

  it("(d) on server error, shows inline error", async () => {
    mockCreateRestockAlert.mockResolvedValue({ ok: false, errors: { email: ["Error"] } });

    const user = userEvent.setup();
    render(
      <RestockAlertForm
        productId="prod-1"
        isAuthenticated={false}
      />,
    );

    const input = screen.getByRole("textbox");
    await user.type(input, "fail@example.com");
    const button = screen.getByRole("button");
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/no se pudo/i)).toBeInTheDocument();
    });
  });
});
