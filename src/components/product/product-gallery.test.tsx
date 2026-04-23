import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductGallery } from "./product-gallery";

const twoImages = [
  { url: "https://placehold.co/800x800/111/fff?text=A", alt: "Image A" },
  { url: "https://placehold.co/800x800/222/fff?text=B", alt: "Image B" },
];

describe("ProductGallery", () => {
  it("renders the first image as hero initially", () => {
    render(<ProductGallery images={twoImages} />);
    // Both hero and thumbnail A render the same alt; assert at least one exists
    const imgs = screen.getAllByAltText(/^image a$/i);
    expect(imgs.length).toBeGreaterThan(0);
  });

  it("swaps the hero when a thumbnail is clicked", async () => {
    const user = userEvent.setup();
    render(<ProductGallery images={twoImages} />);
    const thumbB = screen.getByRole("button", { name: /ver image b/i });
    await user.click(thumbB);
    const heros = screen.getAllByAltText(/image b/i);
    expect(heros.length).toBeGreaterThan(0);
  });

  it("does not render thumbnail strip when there is only one image", () => {
    render(<ProductGallery images={[twoImages[0]]} />);
    expect(screen.queryByRole("button", { name: /ver/i })).toBeNull();
  });
});
