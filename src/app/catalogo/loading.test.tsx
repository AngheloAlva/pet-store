import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Loading from "./loading";

describe("catalog loading", () => {
  it("renders a status region with the Spanish label", () => {
    const { container } = render(<Loading />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-label", "Cargando productos");
    expect(container.contains(status)).toBe(true);
  });

  it("renders exactly 12 product card skeletons", () => {
    const { container } = render(<Loading />);
    const cards = container.querySelectorAll(
      '[data-slot="product-card-skeleton"]',
    );
    expect(cards.length).toBe(12);
  });
});
