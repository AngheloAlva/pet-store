import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StoreCard } from "./store-card";
import { getStoreBySlug } from "@/lib/stores";

const providencia = getStoreBySlug("providencia")!;
const nunoa = getStoreBySlug("nunoa")!;

describe("StoreCard", () => {
  it("renders full store information including reference and schedule", () => {
    render(<StoreCard store={providencia} isSelected={false} onSelect={() => {}} />);

    // name and commune are both "Providencia" for this seed store — both should appear
    expect(screen.getAllByText(providencia.name).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(providencia.commune).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(providencia.address)).toBeInTheDocument();

    const phone = screen.getByRole("link", { name: providencia.phone });
    expect(phone).toHaveAttribute(
      "href",
      `tel:${providencia.phone.replace(/\s/g, "")}`,
    );

    // services badges (3 for providencia)
    expect(screen.getByText("Tienda")).toBeInTheDocument();
    expect(screen.getByText("Veterinaria")).toBeInTheDocument();
    expect(screen.getByText("Peluquería")).toBeInTheDocument();

    expect(screen.getByText(providencia.reference!)).toBeInTheDocument();

    // schedule lines
    expect(screen.getByText(providencia.schedule.weekdays)).toBeInTheDocument();
    expect(screen.getByText(providencia.schedule.saturday)).toBeInTheDocument();
    expect(screen.getByText(providencia.schedule.sunday)).toBeInTheDocument();
  });

  it("omits the reference row for stores without a reference", () => {
    render(<StoreCard store={nunoa} isSelected={false} onSelect={() => {}} />);
    // Ñuñoa has no reference — nothing with the typical reference pattern
    const refText = "Metro";
    // providencia's reference mentions Metro; nunoa has none
    const hit = screen.queryByText(new RegExp(refText, "i"));
    expect(hit).toBeNull();
  });

  it("calls onSelect with the store slug when clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <StoreCard store={providencia} isSelected={false} onSelect={onSelect} />,
    );
    await user.click(screen.getByRole("button", { name: new RegExp(providencia.name, "i") }));
    expect(onSelect).toHaveBeenCalledWith(providencia.slug);
  });

  it("adds aria-current when selected", () => {
    render(
      <StoreCard store={providencia} isSelected={true} onSelect={() => {}} />,
    );
    const card = screen.getByRole("button", { name: new RegExp(providencia.name, "i") });
    expect(card).toHaveAttribute("aria-current", "true");
  });

  it("triggers onSelect on Enter key", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <StoreCard store={providencia} isSelected={false} onSelect={onSelect} />,
    );
    const card = screen.getByRole("button", { name: new RegExp(providencia.name, "i") });
    card.focus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(providencia.slug);
  });

  it("calls registerRef with the card element on mount", () => {
    const registerRef = vi.fn();
    render(
      <StoreCard
        store={providencia}
        isSelected={false}
        onSelect={() => {}}
        registerRef={registerRef}
      />,
    );
    expect(registerRef).toHaveBeenCalled();
    const arg = registerRef.mock.calls[0][0] as HTMLElement | null;
    expect(arg).not.toBeNull();
    expect(arg?.tagName).toBe("BUTTON");
  });
});
