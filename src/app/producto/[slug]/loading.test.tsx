import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Loading from "./loading";

describe("PDP loading", () => {
  it("renders a status region with the Spanish label", () => {
    render(<Loading />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-label", "Cargando producto");
  });

  it("renders a gallery square placeholder and multiple line placeholders", () => {
    const { container } = render(<Loading />);
    const square = container.querySelector(".aspect-square");
    expect(square).not.toBeNull();
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(4);
  });
});
