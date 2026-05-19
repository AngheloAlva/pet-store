import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { db } from "@/db";

vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: "email-1",
  toEmail: "camila@demo.cl",
  subject: "Confirmación de turno",
  type: "appointment_confirmation",
  bodyHtml: "<p>body</p>",
  bodyText: "body",
  createdAt: new Date("2026-05-19T10:00:00.000Z"),
  triggeredBy: null,
  toUserId: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/demo/inbox page", () => {
  it("S-PUBLIC-1: renders all rows when no filters", async () => {
    const rows = [
      makeRow({ id: "e1", type: "welcome", subject: "Bienvenida" }),
      makeRow({ id: "e2", type: "appointment_confirmation", subject: "Turno confirmado" }),
      makeRow({ id: "e3", type: "points_adjustment", subject: "Ajuste puntos" }),
    ];

    let orderByChain: unknown;
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(async () => rows),
          })),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(async () => rows),
        })),
      })),
    }));
    (db as AnyDb).select = mockSelect;
    void orderByChain;

    const { default: Page } = await import("../page");
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByText("Bienvenida")).toBeDefined();
    expect(screen.getByText("Turno confirmado")).toBeDefined();
    expect(screen.getByText("Ajuste puntos")).toBeDefined();
  });

  it("S-PUBLIC-1: renders empty state when no rows", async () => {
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(async () => []),
          })),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(async () => []),
        })),
      })),
    }));
    (db as AnyDb).select = mockSelect;

    const { default: Page } = await import("../page");
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByText(/Tu bandeja está vacía/i)).toBeDefined();
  });

  it("renders type badge on each row", async () => {
    const rows = [makeRow({ id: "e1", type: "welcome", subject: "Bienvenida" })];
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(async () => rows),
          })),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(async () => rows),
        })),
      })),
    }));
    (db as AnyDb).select = mockSelect;

    const { default: Page } = await import("../page");
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getAllByText("camila@demo.cl").length).toBeGreaterThan(0);
    expect(screen.getByText("welcome")).toBeDefined();
  });
});
