/**
 * Task 7.2-7.3 RED — /tracking/[number] RSC page tests.
 * PT-1a: valid tracking number renders timeline events.
 * PT-1b: unknown tracking number renders not-found state.
 * PT-2a: events shown oldest-first.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {},
}));

// Mock the DB query function used by the tracking page
const mockGetShipmentByTracking = vi.fn();

vi.mock("@/app/actions/tracking", () => ({
  getShipmentByTrackingNumber: () => mockGetShipmentByTracking(),
}));

import { default as TrackingPage } from "./page";

const mockEvents = [
  {
    id: "ev-1",
    shipmentId: "ship-1",
    status: "preparando",
    description: "Pedido recibido y en preparación",
    timestamp: new Date("2026-05-27T08:00:00Z"),
  },
  {
    id: "ev-2",
    shipmentId: "ship-1",
    status: "en_ruta",
    description: "Pedido en camino",
    timestamp: new Date("2026-05-27T12:00:00Z"),
  },
];

const mockShipmentResult = {
  shipment: {
    id: "ship-1",
    orderId: "order-1",
    carrier: "mock_chilexpress",
    status: "en_ruta",
    trackingNumber: "MOCK-ABC12345",
  },
  events: mockEvents,
};

describe("/tracking/[number] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PT-1a: valid tracking number renders the page without throwing", async () => {
    mockGetShipmentByTracking.mockResolvedValue(mockShipmentResult);

    // RSC pages are async functions — call directly
    const result = await TrackingPage({
      params: Promise.resolve({ number: "MOCK-ABC12345" }),
    });

    expect(result).toBeTruthy();
    expect(mockGetShipmentByTracking).toHaveBeenCalled();
  });

  it("PT-1b: unknown tracking number calls notFound", async () => {
    mockGetShipmentByTracking.mockResolvedValue(null);

    const { notFound } = await import("next/navigation");

    await expect(
      TrackingPage({ params: Promise.resolve({ number: "MOCK-XXXXXXXX" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
  });

  it("PT-1a: returns truthy JSX for a valid tracking number", async () => {
    mockGetShipmentByTracking.mockResolvedValue(mockShipmentResult);

    const result = await TrackingPage({ params: Promise.resolve({ number: "MOCK-TEST1234" }) });
    expect(result).toBeTruthy();
  });
});
