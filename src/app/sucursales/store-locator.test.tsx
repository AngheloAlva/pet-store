import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const flyToMock = vi.fn();
const replaceMock = vi.fn();
const searchParamsState: { current: URLSearchParams } = {
  current: new URLSearchParams(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/sucursales",
  useSearchParams: () => searchParamsState.current,
}));

vi.mock("@/components/ui/map", async () => {
  const React = await import("react");
  return {
    Map: React.forwardRef<unknown, { children?: React.ReactNode }>(function MockMap(
      { children },
      ref,
    ) {
      React.useImperativeHandle(ref, () => ({ flyTo: flyToMock }), []);
      return <div data-slot="map">{children}</div>;
    }),
    MapMarker: ({
      children,
      onClick,
      longitude,
      latitude,
    }: {
      children?: React.ReactNode;
      onClick?: (e: unknown) => void;
      longitude: number;
      latitude: number;
    }) => (
      <div
        data-slot="marker"
        data-lng={longitude}
        data-lat={latitude}
        onClick={() => onClick?.({})}
      >
        {children}
      </div>
    ),
    MarkerContent: ({
      children,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement>) => (
      <div data-slot="marker-content" {...rest}>
        {children}
      </div>
    ),
    MapPopup: ({
      children,
      onClose,
    }: {
      children?: React.ReactNode;
      onClose?: () => void;
      longitude: number;
      latitude: number;
    }) => (
      <div data-slot="map-popup">
        {children}
        <button data-slot="popup-close" onClick={() => onClose?.()}>
          close
        </button>
      </div>
    ),
    MapControls: () => null,
  };
});

import { StoreLocator } from "./store-locator";
import { stores } from "@/data";

beforeEach(() => {
  flyToMock.mockClear();
  replaceMock.mockClear();
  searchParamsState.current = new URLSearchParams();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("StoreLocator", () => {
  it("renders one card per store", () => {
    render(<StoreLocator stores={stores} initialSlug={null} />);
    const cards = screen.getAllByRole("button", {
      name: new RegExp(`^(${stores.map((s) => s.name).join("|")})$`),
    });
    // Note: names may appear inside card headings; check list items by iterating
    for (const store of stores) {
      const card = screen.getAllByRole("button", {
        name: new RegExp(store.name, "i"),
      })[0];
      expect(card).toBeInTheDocument();
    }
    expect(cards.length).toBeGreaterThanOrEqual(stores.length);
  });

  it("preselects the store given via initialSlug (URL already matches)", () => {
    searchParamsState.current = new URLSearchParams("tienda=maipu");
    render(<StoreLocator stores={stores} initialSlug="maipu" />);
    const maipuCard = screen
      .getAllByRole("button", { name: /maipú/i })
      .find((el) => el.getAttribute("aria-current") === "true");
    expect(maipuCard).toBeDefined();
    expect(document.querySelector('[data-slot="map-popup"]')).not.toBeNull();
  });

  it("updates the URL with replace({ scroll: false }) when a card is clicked", async () => {
    const user = userEvent.setup();
    render(<StoreLocator stores={stores} initialSlug={null} />);

    const providenciaCard = screen
      .getAllByRole("button", { name: /providencia/i })
      .find((el) => el.tagName === "BUTTON")!;
    await user.click(providenciaCard);

    expect(replaceMock).toHaveBeenCalled();
    const [url, opts] = replaceMock.mock.calls.at(-1)!;
    expect(url).toBe("/sucursales?tienda=providencia");
    expect(opts).toEqual({ scroll: false });
  });

  it("clears the URL param when the popup close fires", async () => {
    searchParamsState.current = new URLSearchParams("tienda=maipu");
    const user = userEvent.setup();
    render(<StoreLocator stores={stores} initialSlug="maipu" />);

    await user.click(screen.getByText("close"));

    const [url, opts] = replaceMock.mock.calls.at(-1)!;
    expect(url).toBe("/sucursales");
    expect(opts).toEqual({ scroll: false });
  });

  it("scrolls the matching card into view when a marker is clicked", async () => {
    const scrollSpy = vi
      .spyOn(HTMLElement.prototype, "scrollIntoView")
      .mockImplementation(() => {});
    const user = userEvent.setup();
    render(<StoreLocator stores={stores} initialSlug={null} />);

    const markers = document.querySelectorAll('[data-slot="marker"]');
    const first = markers[0] as HTMLElement;
    await user.click(first);

    expect(scrollSpy).toHaveBeenCalled();
  });

  it("reconciles state when the URL changes externally (back/forward)", () => {
    searchParamsState.current = new URLSearchParams();
    const { rerender } = render(
      <StoreLocator stores={stores} initialSlug={null} />,
    );
    expect(document.querySelector('[data-slot="map-popup"]')).toBeNull();

    searchParamsState.current = new URLSearchParams("tienda=las-condes");
    rerender(<StoreLocator stores={stores} initialSlug={null} />);

    expect(document.querySelector('[data-slot="map-popup"]')).not.toBeNull();
    const lasCondesCard = screen
      .getAllByRole("button", { name: /las condes/i })
      .find((el) => el.getAttribute("aria-current") === "true");
    expect(lasCondesCard).toBeDefined();
  });

  it("ignores an unknown slug in the URL (soft fallback)", () => {
    searchParamsState.current = new URLSearchParams("tienda=ciudad-inventada");
    render(<StoreLocator stores={stores} initialSlug={null} />);
    expect(document.querySelector('[data-slot="map-popup"]')).toBeNull();
  });

  it("renders the mobile map toggle button with md:hidden and flips its label", async () => {
    const user = userEvent.setup();
    render(<StoreLocator stores={stores} initialSlug={null} />);

    const toggle = screen.getByRole("button", { name: /mostrar mapa/i });
    expect(toggle.className).toContain("md:hidden");

    await user.click(toggle);
    expect(
      screen.getByRole("button", { name: /ocultar mapa/i }),
    ).toBeInTheDocument();
  });
});
