import { vi, describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import { sendDemoEmail } from "@/lib/notifications/demo-email";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("@/lib/notifications/demo-email", () => ({
  sendDemoEmail: vi.fn(async () => ({ id: "mock-email-id" })),
}));

const mockSendDemoEmail = vi.mocked(sendDemoEmail);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
const getDispatch = async () => {
  const m = await import("./dispatch");
  return m;
};

describe("dispatchRestockAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("(a) returns {fired:0, skipped:0} when no pending alerts exist", async () => {
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    }));

    const { dispatchRestockAlerts } = await getDispatch();
    const result = await dispatchRestockAlerts({
      productId: "prod-1",
      events: [{ variantId: "var-1", storeId: "store-1", storeName: "Tienda 1", productName: "Producto 1" }],
    });

    expect(result).toEqual({ fired: 0, skipped: 0 });
  });

  it("(b) variantId match — fires 2 alerts for matching variant", async () => {
    const alerts = [
      {
        id: "alert-1",
        email: "user1@example.com",
        userId: "user-1",
        variantId: "var-1",
        storeIds: null,
        cancelToken: "token-1",
        status: "pending",
      },
      {
        id: "alert-2",
        email: "user2@example.com",
        userId: "user-2",
        variantId: "var-1",
        storeIds: null,
        cancelToken: "token-2",
        status: "pending",
      },
    ];

    const updateWhereMock = vi.fn(async () => ({}));
    const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
    const updateMock = vi.fn(() => ({ set: updateSetMock }));

    (db as AnyDb).select = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(async () => alerts),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(async () => [{ id: "prod-1", name: "Producto 1" }]),
        })),
      })
      .mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(async () => [{ id: "var-1", name: "Variante 1" }]),
        })),
      });

    (db as AnyDb).update = updateMock;

    const { dispatchRestockAlerts } = await getDispatch();
    const result = await dispatchRestockAlerts({
      productId: "prod-1",
      events: [{ variantId: "var-1", storeId: "store-1", storeName: "Tienda 1", productName: "Producto 1" }],
    });

    expect(result.fired).toBe(2);
    expect(result.skipped).toBe(0);
    expect(mockSendDemoEmail).toHaveBeenCalledTimes(2);
  });

  it("(c) variantId=null (product-level) — fires alert with null variantId", async () => {
    const alerts = [
      {
        id: "alert-3",
        email: "user3@example.com",
        userId: null,
        variantId: null,  // null = any variant
        storeIds: null,
        cancelToken: "token-3",
        status: "pending",
      },
    ];

    const updateWhereMock = vi.fn(async () => ({}));
    const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
    const updateMock = vi.fn(() => ({ set: updateSetMock }));

    (db as AnyDb).select = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(async () => alerts),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(async () => [{ id: "prod-1", name: "Producto 1" }]),
        })),
      })
      .mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(async () => [{ id: "var-1", name: "Variante 1" }]),
        })),
      });

    (db as AnyDb).update = updateMock;

    const { dispatchRestockAlerts } = await getDispatch();
    const result = await dispatchRestockAlerts({
      productId: "prod-1",
      events: [{ variantId: "var-1", storeId: "store-1", storeName: "Tienda 1", productName: "Producto 1" }],
    });

    expect(result.fired).toBe(1);
    expect(mockSendDemoEmail).toHaveBeenCalledTimes(1);
  });

  it("(d) storeIds filter — excludes alerts for non-matching store", async () => {
    const alerts = [
      {
        id: "alert-4",
        email: "user4@example.com",
        userId: null,
        variantId: "var-1",
        storeIds: ["store-only-this"],  // only matches store-only-this
        cancelToken: "token-4",
        status: "pending",
      },
      {
        id: "alert-5",
        email: "user5@example.com",
        userId: null,
        variantId: "var-1",
        storeIds: null,  // null = any store
        cancelToken: "token-5",
        status: "pending",
      },
    ];

    const updateWhereMock = vi.fn(async () => ({}));
    const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
    const updateMock = vi.fn(() => ({ set: updateSetMock }));

    (db as AnyDb).select = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(async () => alerts),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(async () => [{ id: "prod-1", name: "Producto 1" }]),
        })),
      })
      .mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(async () => [{ id: "var-1", name: "Variante 1" }]),
        })),
      });

    (db as AnyDb).update = updateMock;

    const { dispatchRestockAlerts } = await getDispatch();
    // Fire for store-different, not store-only-this
    const result = await dispatchRestockAlerts({
      productId: "prod-1",
      events: [{ variantId: "var-1", storeId: "store-different", storeName: "Otra Tienda", productName: "Producto 1" }],
    });

    // alert-4 should be excluded (storeIds=['store-only-this'] doesn't include 'store-different')
    // alert-5 should be fired (storeIds=null)
    expect(result.fired).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it("(e) sendDemoEmail throws on alert #2 → #1 and #3 fired, function resolves", async () => {
    const alerts = [
      {
        id: "alert-a",
        email: "a@example.com",
        userId: null,
        variantId: "var-1",
        storeIds: null,
        cancelToken: "token-a",
        status: "pending",
      },
      {
        id: "alert-b",
        email: "b@example.com",
        userId: null,
        variantId: "var-1",
        storeIds: null,
        cancelToken: "token-b",
        status: "pending",
      },
      {
        id: "alert-c",
        email: "c@example.com",
        userId: null,
        variantId: "var-1",
        storeIds: null,
        cancelToken: "token-c",
        status: "pending",
      },
    ];

    const updateWhereMock = vi.fn(async () => ({}));
    const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
    const updateMock = vi.fn(() => ({ set: updateSetMock }));

    (db as AnyDb).select = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(async () => alerts),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(async () => [{ id: "prod-1", name: "Producto 1" }]),
        })),
      })
      .mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(async () => [{ id: "var-1", name: "Variante 1" }]),
        })),
      });

    (db as AnyDb).update = updateMock;

    // 2nd call throws
    mockSendDemoEmail
      .mockResolvedValueOnce({ id: "id-1" })
      .mockRejectedValueOnce(new Error("SMTP failure"))
      .mockResolvedValueOnce({ id: "id-3" });

    const { dispatchRestockAlerts } = await getDispatch();
    const result = await dispatchRestockAlerts({
      productId: "prod-1",
      events: [{ variantId: "var-1", storeId: "store-1", storeName: "Tienda 1", productName: "Producto 1" }],
    });

    // Function must resolve (not throw)
    expect(result.fired).toBe(2);
    expect(result.skipped).toBe(1);
  });
});
