import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StorePopupCard } from "./store-popup-card";
import { getStoreBySlug } from "@/lib/stores";

describe("StorePopupCard", () => {
  it("renders name, address, and a tel: phone link", () => {
    const store = getStoreBySlug("providencia")!;
    render(<StorePopupCard store={store} />);

    expect(screen.getByText(store.name)).toBeInTheDocument();
    expect(screen.getByText(store.address)).toBeInTheDocument();

    const phoneLink = screen.getByRole("link", { name: store.phone });
    const expectedHref = `tel:${store.phone.replace(/\s/g, "")}`;
    expect(phoneLink).toHaveAttribute("href", expectedHref);
  });
});
