import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GlobalError from "./error";

const secret = "SECRET_TOKEN_12345";

describe("global error boundary", () => {
  it("renders a generic Spanish message without leaking error details", () => {
    render(
      <GlobalError error={new Error(secret) as Error & { digest?: string }} reset={() => {}} />,
    );
    expect(screen.getByRole("heading", { name: /algo salió mal/i })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(secret);
  });

  it("invokes reset when Reintentar is clicked", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<GlobalError error={new Error("x")} reset={reset} />);
    await user.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("provides a home link", () => {
    render(<GlobalError error={new Error("x")} reset={() => {}} />);
    const home = screen.getByRole("link", { name: /inicio/i });
    expect(home).toHaveAttribute("href", "/");
  });
});
