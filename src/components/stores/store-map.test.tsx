import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const flyToMock = vi.fn();

vi.mock("@/components/ui/map", async () => {
  const React = await import("react");
  return {
    Map: React.forwardRef<
      { flyTo: typeof flyToMock },
      { children?: React.ReactNode; theme?: string; className?: string }
    >(function MockMap({ children }, ref) {
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
      longitude,
      latitude,
    }: {
      children?: React.ReactNode;
      onClose?: () => void;
      longitude: number;
      latitude: number;
    }) => (
      <div data-slot="map-popup" data-lng={longitude} data-lat={latitude}>
        {children}
        <button data-slot="popup-close" onClick={() => onClose?.()}>
          close
        </button>
      </div>
    ),
    MapControls: () => null,
  };
});

import { StoreMap } from "./store-map";
import { stores } from "@/test/fixtures";

beforeEach(() => {
  flyToMock.mockClear();
});

describe("StoreMap", () => {
  it("renders one marker per store with its coordinates", () => {
    render(
      <StoreMap stores={stores} selectedSlug={null} onSelect={() => {}} />,
    );
    const markers = document.querySelectorAll('[data-slot="marker"]');
    expect(markers.length).toBe(stores.length);
    const first = markers[0] as HTMLElement;
    expect(first.dataset.lng).toBe(String(stores[0].coordinates.lng));
    expect(first.dataset.lat).toBe(String(stores[0].coordinates.lat));
  });

  it("marks the selected marker with data-selected='true'", () => {
    render(
      <StoreMap
        stores={stores}
        selectedSlug="maipu"
        onSelect={() => {}}
      />,
    );
    const selected = document.querySelectorAll('[data-selected="true"]');
    expect(selected.length).toBe(1);
  });

  it("calls onSelect when a marker is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <StoreMap stores={stores} selectedSlug={null} onSelect={onSelect} />,
    );
    const firstMarker = document.querySelectorAll('[data-slot="marker"]')[0] as HTMLElement;
    await user.click(firstMarker);
    expect(onSelect).toHaveBeenCalledWith(stores[0].slug);
  });

  it("renders MapPopup at the selected store coordinates", () => {
    render(
      <StoreMap
        stores={stores}
        selectedSlug="las-condes"
        onSelect={() => {}}
      />,
    );
    const popup = document.querySelector('[data-slot="map-popup"]') as HTMLElement | null;
    expect(popup).not.toBeNull();
    const las = stores.find((s) => s.slug === "las-condes")!;
    expect(popup?.dataset.lng).toBe(String(las.coordinates.lng));
    expect(popup?.dataset.lat).toBe(String(las.coordinates.lat));
  });

  it("does not render MapPopup when nothing is selected", () => {
    render(
      <StoreMap stores={stores} selectedSlug={null} onSelect={() => {}} />,
    );
    expect(document.querySelector('[data-slot="map-popup"]')).toBeNull();
  });

  it("calls onSelect(null) when the popup close is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <StoreMap
        stores={stores}
        selectedSlug="providencia"
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByText("close"));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("calls flyTo when selectedSlug changes", () => {
    const { rerender } = render(
      <StoreMap stores={stores} selectedSlug={null} onSelect={() => {}} />,
    );
    expect(flyToMock).not.toHaveBeenCalled();
    rerender(
      <StoreMap
        stores={stores}
        selectedSlug="maipu"
        onSelect={() => {}}
      />,
    );
    expect(flyToMock).toHaveBeenCalledTimes(1);
    const call = flyToMock.mock.calls[0][0];
    const maipu = stores.find((s) => s.slug === "maipu")!;
    expect(call.center).toEqual([maipu.coordinates.lng, maipu.coordinates.lat]);
    expect(call.zoom).toBeGreaterThanOrEqual(14);
  });
});
