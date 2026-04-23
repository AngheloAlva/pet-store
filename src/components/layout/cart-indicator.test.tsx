import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartIndicator } from "./cart-indicator";
import { useCartStore } from "@/stores/cart";

describe("CartIndicator", () => {
  beforeEach(() => {
    useCartStore.getState().clear();
    useCartStore.getState().closeCart();
  });

  it("renders a button (not a navigation link)", () => {
    render(<CartIndicator />);
    const btn = screen.getByRole("button", { name: /carrito/i });
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe("BUTTON");
    expect(btn).not.toHaveAttribute("href");
  });

  it("calls openCart when clicked", async () => {
    const user = userEvent.setup();
    render(<CartIndicator />);
    await user.click(screen.getByRole("button", { name: /carrito/i }));
    expect(useCartStore.getState().isOpen).toBe(true);
  });
});
