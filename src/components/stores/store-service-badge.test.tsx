import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StoreServiceBadge } from "./store-service-badge";

describe("StoreServiceBadge", () => {
  it("renders the Spanish label for shop", () => {
    render(<StoreServiceBadge service="shop" />);
    expect(screen.getByText("Tienda")).toBeInTheDocument();
  });

  it("renders labels for vet, grooming, pharmacy", () => {
    const { rerender } = render(<StoreServiceBadge service="vet" />);
    expect(screen.getByText("Veterinaria")).toBeInTheDocument();
    rerender(<StoreServiceBadge service="grooming" />);
    expect(screen.getByText("Peluquería")).toBeInTheDocument();
    rerender(<StoreServiceBadge service="pharmacy" />);
    expect(screen.getByText("Farmacia")).toBeInTheDocument();
  });

  it("includes an svg icon", () => {
    const { container } = render(<StoreServiceBadge service="shop" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
