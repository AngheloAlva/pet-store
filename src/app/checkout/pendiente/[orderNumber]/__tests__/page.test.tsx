/**
 * Task 3.7 RED — /checkout/pendiente/[orderNumber] page test.
 * Renders order number.
 * Does NOT render any DTE substring.
 * Renders under-review copy.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {},
  dbReady: Promise.resolve(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock drizzle queries
const mockOrderNumber = "PET-20260101-00001";

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: actual.eq,
    and: actual.and,
  };
});

describe("/checkout/pendiente/[orderNumber] page", () => {
  it("renders order number and under-review copy", async () => {
    const { default: PendientePage } = await import(
      "@/app/checkout/pendiente/[orderNumber]/page"
    );

    render(
      await PendientePage({
        params: Promise.resolve({ orderNumber: mockOrderNumber }),
        orderData: {
          id: "order-1",
          orderNumber: mockOrderNumber,
          paymentStatus: "pending_verification",
        },
      }),
    );

    // Renders order number
    expect(screen.getByText(mockOrderNumber)).toBeInTheDocument();

    // Does NOT render DTE reference
    expect(screen.queryByText(/DTE|dte/)).not.toBeInTheDocument();

    // Shows under-review message
    const underReview = screen.queryAllByText(/review|pending|verificaci|transfer|awaiting/i);
    expect(underReview.length).toBeGreaterThan(0);
  });
});
