import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "./not-found";

describe("global not-found", () => {
  it("renders the branded heading", () => {
    render(<NotFound />);
    expect(
      screen.getByRole("heading", { name: /página no encontrada/i }),
    ).toBeInTheDocument();
  });

  it("provides a link back to the home page", () => {
    render(<NotFound />);
    const link = screen.getByRole("link", { name: /inicio/i });
    expect(link).toHaveAttribute("href", "/");
  });
});
